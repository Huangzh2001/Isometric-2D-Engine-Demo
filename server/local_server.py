#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import os
import re
import sys
import hashlib
import time
import traceback
from threading import Lock, Thread
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse

SERVER_DIR = Path(__file__).resolve().parent
ROOT = SERVER_DIR.parent
PREFAB_DIR = ROOT / 'assets' / 'prefabs'
SCENE_DIR = ROOT / 'assets' / 'scenes'
DEFAULT_SCENE_META = SCENE_DIR / '_default_scene.json'
HABBO_ROOT_META = ROOT / 'config' / 'habbo_asset_root.json'
DEFAULT_HABBO_ROOT_RAW = r'E:\\hzh\\Habbo\\habbofurni_models_classified'
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
ROLE = str(sys.argv[2]) if len(sys.argv) > 2 else 'server'
ILLEGAL_CHARS = re.compile(r'[<>:"/\\|?*]+')

SERVER_LOG_DIR = ROOT / 'logs' / 'server'
SERVER_LOG_SESSION_ID = time.strftime('%Y%m%d-%H%M%S')
SERVER_LOG = SERVER_LOG_DIR / f'server-{ROLE}-{SERVER_LOG_SESSION_ID}.log'
SERVER_LATEST_LOG = SERVER_LOG_DIR / f'server-{ROLE}-latest.log'
SELF_CHECK_REPORT_DIR = ROOT / 'logs' / 'self-check'
HABBO_LIBRARY_CACHE: dict[str, dict] = {}
HABBO_LIBRARY_CACHE_INFLIGHT: dict[str, dict] = {}
HABBO_LIBRARY_INDEX_CACHE: dict[str, dict] = {}
HABBO_LIBRARY_CACHE_LOCK = Lock()
P0_ROUTE_REGISTRY = {
    'GET': [
        '/api/health',
        '/api/prefabs/index',
        '/api/habbo/config',
        '/api/habbo/index',
        '/api/habbo/library/index',
        '/api/habbo/library/summary',
        '/api/habbo/library/page',
        '/api/habbo/library/icon',
        '/api/habbo/file',
        '/api/scenes/default',
        '/api/scenes/load',
    ],
    'POST': [
        '/api/prefabs/save',
        '/api/scenes/save',
        '/api/habbo/config',
        '/api/self-check/report',
        '/api/self-check/text-report',
    ],
}


def init_server_logs():
    try:
        SERVER_LOG_DIR.mkdir(parents=True, exist_ok=True)
        header = [
            f'# server log session\n',
            f'# role={ROLE}\n',
            f'# startedAt={SERVER_LOG_SESSION_ID}\n',
            f'# root={ROOT}\n',
            f'# currentLog={SERVER_LOG.relative_to(ROOT)}\n',
            f'# latestLog={SERVER_LATEST_LOG.relative_to(ROOT)}\n',
        ]
        SERVER_LOG.write_text(''.join(header), encoding='utf-8')
        SERVER_LATEST_LOG.write_text(''.join(header), encoding='utf-8')
    except Exception:
        pass


def log_server(msg: str):
    line = msg.rstrip() + '\n'
    try:
        SERVER_LOG_DIR.mkdir(parents=True, exist_ok=True)
        with SERVER_LOG.open('a', encoding='utf-8') as fh:
            fh.write(line)
        with SERVER_LATEST_LOG.open('a', encoding='utf-8') as fh:
            fh.write(line)
    except Exception:
        pass


def p0_server_log(kind: str, message: str, extra: dict | None = None):
    line = f'[P0][{kind}] {message}'
    if extra is not None:
        try:
            line += ' ' + json.dumps(extra, ensure_ascii=False, sort_keys=True)
        except Exception:
            line += ' [extra-unserializable]'
    log_server(line)
    try:
        print(line, flush=True)
    except Exception:
        pass




def p1_server_log(kind: str, message: str, extra: dict | None = None):
    line = f'[P1][{kind}] {message}'
    if extra is not None:
        try:
            line += ' ' + json.dumps(extra, ensure_ascii=False, sort_keys=True)
        except Exception:
            line += ' [extra-unserializable]'
    log_server(line)
    try:
        print(line, flush=True)
    except Exception:
        pass


def p2_server_log(kind: str, message: str, extra: dict | None = None):
    line = f'[P2][{kind}] {message}'
    if extra is not None:
        try:
            line += ' ' + json.dumps(extra, ensure_ascii=False, sort_keys=True)
        except Exception:
            line += ' [extra-unserializable]'
    log_server(line)
    try:
        print(line, flush=True)
    except Exception:
        pass


def p1b_server_log(kind: str, message: str, extra: dict | None = None):
    line = f'[P1b][{kind}] {message}'
    if extra is not None:
        try:
            line += ' ' + json.dumps(extra, ensure_ascii=False, sort_keys=True)
        except Exception:
            line += ' [extra-unserializable]'
    log_server(line)
    try:
        print(line, flush=True)
    except Exception:
        pass


def is_client_disconnect_error(exc: Exception) -> bool:
    if isinstance(exc, (BrokenPipeError, ConnectionAbortedError, ConnectionResetError)):
        return True
    err_no = getattr(exc, 'errno', None)
    win_err = getattr(exc, 'winerror', None)
    return err_no in {32, 104} or win_err in {10053, 10054}


def p0_route_counts() -> dict:
    return {method: len(paths) for method, paths in P0_ROUTE_REGISTRY.items()}


def habbo_diag(msg: str):
    line = '[habbo-diag] ' + str(msg)
    log_server(line)
    try:
        print(line, flush=True)
    except Exception:
        pass


def habbo_error_response(label: str, req_id: str, exc: Exception):
    tb = traceback.format_exc()
    log_server(f'[habbo-error] label={label} reqId={req_id} errorClass={exc.__class__.__name__} error={exc}')
    for ln in tb.rstrip().splitlines():
        log_server('[habbo-trace] ' + ln)
    return {
        'ok': False,
        'error': str(exc),
        'errorClass': exc.__class__.__name__,
        'reqId': req_id,
        'tracebackTail': tb.rstrip().splitlines()[-8:],
    }



def sanitize_filename(name: str, default_stem: str = 'custom_prefab') -> str:
    name = (name or '').strip()
    name = ILLEGAL_CHARS.sub('_', name)
    name = name.rstrip(' .')
    if not name:
        name = default_stem
    if not name.lower().endswith('.json'):
        name += '.json'
    return name


def read_default_scene_filename() -> str:
    try:
        if not DEFAULT_SCENE_META.exists():
            return ''
        data = json.loads(DEFAULT_SCENE_META.read_text(encoding='utf-8'))
        value = str(data.get('file') or '').strip()
        return sanitize_filename(value, 'scene') if value else ''
    except Exception:
        return ''


def write_default_scene_filename(filename: str) -> str:
    SCENE_DIR.mkdir(parents=True, exist_ok=True)
    filename = sanitize_filename(filename, 'scene')
    DEFAULT_SCENE_META.write_text(
        json.dumps({'file': filename}, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8',
    )
    return filename


def normalize_habbo_root(value: str) -> Path:
    raw = str(value or '').strip()
    if not raw:
        raise ValueError('empty root')
    path = Path(os.path.expanduser(raw))
    if not path.is_absolute():
        path = (ROOT / path).resolve()
    else:
        path = path.resolve()
    return path


def write_habbo_root(root_value: str) -> dict:
    root_path = normalize_habbo_root(root_value)
    payload = {'root': str(root_path)}
    HABBO_ROOT_META.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return describe_habbo_root(root_path)


def read_habbo_root() -> Path | None:
    configured_value = ''
    try:
        if HABBO_ROOT_META.exists():
            data = json.loads(HABBO_ROOT_META.read_text(encoding='utf-8'))
            configured_value = str(data.get('root') or '').strip()
            if configured_value:
                return normalize_habbo_root(configured_value)
    except Exception:
        configured_value = ''
    default_value = str(DEFAULT_HABBO_ROOT_RAW or '').strip()
    if not configured_value and default_value:
        try:
            return normalize_habbo_root(default_value)
        except Exception:
            return None
    return None


def count_habbo_swfs(root_path: Path | None) -> int:
    if not root_path or not root_path.exists() or not root_path.is_dir():
        return 0
    index_path = root_path / 'index.json'
    if index_path.exists():
        try:
            raw = json.loads(index_path.read_text(encoding='utf-8'))
            if isinstance(raw, dict) and isinstance(raw.get('totalItems'), int):
                return int(raw.get('totalItems') or 0)
            records = raw if isinstance(raw, list) else raw.get('items') if isinstance(raw, dict) else []
            if isinstance(records, list):
                return len(records)
        except Exception:
            pass
    return 0


def describe_habbo_root(root_path: Path | None = None) -> dict:
    root_path = root_path if root_path is not None else read_habbo_root()
    if not root_path:
        return {'configured': False, 'root': '', 'exists': False, 'itemCount': 0}
    exists = root_path.exists() and root_path.is_dir()
    return {
        'configured': True,
        'root': str(root_path),
        'exists': exists,
        'itemCount': count_habbo_swfs(root_path) if exists else 0,
    }


def iter_habbo_swf_items(root_path: Path):
    if not root_path.exists() or not root_path.is_dir():
        return []
    items = []
    for path in sorted([p for p in root_path.rglob('*') if p.is_file() and p.suffix.lower() == '.swf']):
        try:
            rel = path.relative_to(root_path).as_posix()
        except Exception:
            continue
        stat = path.stat()
        items.append({
            'name': path.name,
            'relativePath': rel,
            'size': stat.st_size,
            'mtimeMs': int(stat.st_mtime * 1000),
        })
    return items


def resolve_habbo_asset_path(relative_path: str) -> tuple[Path, Path]:
    root_path = read_habbo_root()
    if not root_path:
        raise FileNotFoundError('Habbo asset root not configured')
    if not root_path.exists() or not root_path.is_dir():
        raise FileNotFoundError(f'Habbo asset root not found: {root_path}')
    rel = str(relative_path or '').replace('\\', '/').strip().lstrip('/')
    if not rel:
        raise FileNotFoundError('missing relative path')
    for cand in _fallback_asset_candidates(rel):
        target = (root_path / cand).resolve()
        try:
            target.relative_to(root_path)
        except Exception as exc:
            raise FileNotFoundError('path escapes Habbo asset root') from exc
        if target.exists() and target.is_file():
            return root_path, target
    raise FileNotFoundError(f'Habbo asset not found: {rel}')


def safe_rel_to_root(root_path: Path, candidate: str | Path | None) -> str:
    if not candidate:
        return ''
    try:
        path = candidate if isinstance(candidate, Path) else Path(str(candidate))
        path = path.resolve() if path.is_absolute() else (root_path / path).resolve()
        return path.relative_to(root_path).as_posix()
    except Exception:
        return ''


def _dedupe_keep_order(values: list[str]) -> list[str]:
    seen = set()
    out: list[str] = []
    for value in values:
        value = str(value or '').strip().replace('\\', '/').lstrip('/')
        if not value or value in seen:
            continue
        seen.add(value)
        out.append(value)
    return out


def _library_name_candidates(classname: str, dest_dir_rel: str = '') -> list[str]:
    raw = str(classname or '').strip()
    dir_base = Path(dest_dir_rel).name if dest_dir_rel else ''
    values: list[str] = []
    if raw:
        values.append(raw)
        values.append(raw.replace('*', '_'))
        values.append(re.sub(r'\*(\d+)$', r'_\1', raw))
        values.append(re.sub(r'\*(\d+)$', '', raw))
    if dir_base:
        values.insert(0, dir_base)
        values.append(dir_base.replace('*', '_'))
    return _dedupe_keep_order(values)


def _guess_rel_from_dir(dest_dir_rel: str, classname: str, suffix: str) -> str:
    if not dest_dir_rel:
        return ''
    for stem in _library_name_candidates(classname, dest_dir_rel):
        return f'{dest_dir_rel}/{stem}{suffix}'
    return ''


def _fallback_asset_candidates(relative_path: str) -> list[str]:
    rel = str(relative_path or '').replace('\\', '/').strip().lstrip('/')
    if not rel:
        return []
    path = Path(rel)
    parent = path.parent.as_posix() if str(path.parent) != '.' else ''
    suffix = path.suffix
    stem = path.stem
    values = [rel]
    stem_candidates = _library_name_candidates(stem, parent)
    for cand in stem_candidates:
        values.append(((parent + '/') if parent else '') + cand + suffix)
    return _dedupe_keep_order(values)


def _fast_rel_to_root(root_path: Path, candidate: str | Path | None) -> str:
    if not candidate:
        return ''
    try:
        root_norm = str(root_path).replace('\\', '/').rstrip('/')
        cand_norm = str(candidate).strip().replace('\\', '/')
        if not cand_norm:
            return ''
        if re.match(r'^[A-Za-z]:/', cand_norm) or cand_norm.startswith('/'):
            root_cmp = root_norm.lower()
            cand_cmp = cand_norm.lower()
            prefix = root_cmp + '/'
            if cand_cmp == root_cmp:
                return ''
            if cand_cmp.startswith(prefix):
                return cand_norm[len(root_norm) + 1:].lstrip('/')
            return ''
        return cand_norm.lstrip('/')
    except Exception:
        return ''


def _guess_record_tail_dir(candidate: str | Path | None) -> str:
    raw = str(candidate or '').strip().replace('\\', '/')
    if not raw:
        return ''
    parts = [p for p in raw.split('/') if p]
    if not parts:
        return ''
    if parts[-1].lower().endswith(('.swf', '.png')):
        parts = parts[:-1]
    if not parts:
        return ''
    lower_parts = [p.lower() for p in parts]
    for idx, part in enumerate(lower_parts):
        if part in ('room', 'wall') and idx + 1 < len(parts):
            return '/'.join(parts[idx:])
    if len(parts) >= 4:
        return '/'.join(parts[-4:])
    return ''


def guess_library_entry_paths(root_path: Path, record: dict) -> tuple[str, str]:
    classname = str(record.get('classname') or '').strip()
    dest_dir_rel = (
        _fast_rel_to_root(root_path, record.get('dest_dir'))
        or safe_rel_to_root(root_path, record.get('dest_dir'))
        or _guess_record_tail_dir(record.get('dest_dir'))
        or _guess_record_tail_dir(record.get('source_swf'))
        or _guess_record_tail_dir(record.get('source_icon'))
    )
    swf_rel = (
        _fast_rel_to_root(root_path, record.get('copied_swf'))
        or _fast_rel_to_root(root_path, record.get('swf'))
        or _fast_rel_to_root(root_path, record.get('swf_path'))
        or _fast_rel_to_root(root_path, record.get('source_swf'))
        or safe_rel_to_root(root_path, record.get('copied_swf'))
        or safe_rel_to_root(root_path, record.get('swf'))
        or safe_rel_to_root(root_path, record.get('swf_path'))
        or safe_rel_to_root(root_path, record.get('source_swf'))
    )
    icon_rel = (
        _fast_rel_to_root(root_path, record.get('copied_icon'))
        or _fast_rel_to_root(root_path, record.get('icon'))
        or _fast_rel_to_root(root_path, record.get('icon_path'))
        or _fast_rel_to_root(root_path, record.get('source_icon'))
        or safe_rel_to_root(root_path, record.get('copied_icon'))
        or safe_rel_to_root(root_path, record.get('icon'))
        or safe_rel_to_root(root_path, record.get('icon_path'))
        or safe_rel_to_root(root_path, record.get('source_icon'))
    )
    if dest_dir_rel:
        if not swf_rel:
            swf_rel = _guess_rel_from_dir(dest_dir_rel, classname, '.swf')
        if not icon_rel and bool(record.get('has_icon')):
            icon_rel = _guess_rel_from_dir(dest_dir_rel, classname, '.png')
    if swf_rel and not icon_rel and bool(record.get('has_icon')):
        icon_rel = str(Path(swf_rel).with_suffix('.png')).replace('\\', '/')
    return swf_rel, icon_rel


def make_library_asset_id(record: dict, swf_rel: str) -> str:
    base = str(record.get('classname') or Path(swf_rel or 'item.swf').stem or 'item').strip() or 'item'
    scope = '|'.join([str(record.get('type') or ''), str(record.get('category') or ''), str(record.get('furni_line') or ''), swf_rel])
    digest = hashlib.sha1(scope.encode('utf-8')).hexdigest()[:12]
    return f"{base}__{digest}"


def normalize_library_item(root_path: Path, record: dict) -> dict | None:
    swf_rel, icon_rel = guess_library_entry_paths(root_path, record)
    if not swf_rel:
        return None
    type_name = str(record.get('type') or 'room').strip().lower() or 'room'
    category = str(record.get('category') or 'other').strip().lower() or 'other'
    furni_line = str(record.get('furni_line') or 'other').strip().lower() or 'other'
    stem = Path(swf_rel).stem
    classname = str(record.get('classname') or stem).strip() or stem
    display_name = str(record.get('displayName') or record.get('name') or classname).strip() or classname
    return {
        'assetId': make_library_asset_id(record, swf_rel),
        'prefabId': 'habbo_' + Path(swf_rel).with_suffix('').as_posix().replace('/', '_').replace(' ', '_'),
        'classname': classname,
        'displayName': display_name,
        'type': type_name,
        'category': category,
        'furniLine': furni_line,
        'swfRelativePath': swf_rel,
        'iconRelativePath': icon_rel or '',
        'hasIcon': bool(icon_rel),
        'tags': [type_name, category, furni_line, classname, display_name],
    }


def _normalize_text_token(value) -> str:
    return str(value or '').strip().lower()


def build_library_item_from_record_fast(root_path: Path, record: dict) -> dict | None:
    if not isinstance(record, dict):
        return None
    swf_rel, icon_rel = guess_library_entry_paths(root_path, record)
    if not swf_rel:
        return None
    type_name = _normalize_text_token(record.get('type') or 'room') or 'room'
    category = _normalize_text_token(record.get('category') or 'other') or 'other'
    furni_line = _normalize_text_token(record.get('furni_line') or 'other') or 'other'
    classname = str(record.get('classname') or Path(swf_rel).stem).strip() or Path(swf_rel).stem
    display_name = str(record.get('displayName') or record.get('name') or classname).strip() or classname
    return {
        'assetId': make_library_asset_id(record, swf_rel),
        'prefabId': 'habbo_' + Path(swf_rel).with_suffix('').as_posix().replace('/', '_').replace(' ', '_'),
        'classname': classname,
        'displayName': display_name,
        'type': type_name,
        'category': category,
        'furniLine': furni_line,
        'swfRelativePath': swf_rel,
        'iconRelativePath': icon_rel or '',
        'hasIcon': bool(icon_rel) or bool(record.get('has_icon')),
        'tags': [type_name, category, furni_line, classname, display_name],
    }


def record_matches_library_query(record: dict, type_name: str, category: str, search: str) -> bool:
    if not isinstance(record, dict):
        return False
    if _normalize_text_token(record.get('type') or 'room') != type_name:
        return False
    record_category = _normalize_text_token(record.get('category') or 'other') or 'other'
    if category != 'all' and record_category != category:
        return False
    if search:
        classname = str(record.get('classname') or '').strip()
        furni_line = str(record.get('furni_line') or '').strip()
        hay = ' '.join([classname, record_category, furni_line, str(record.get('displayName') or ''), str(record.get('name') or '')]).lower()
        if search not in hay:
            return False
    return True


def scan_habbo_library_fallback(root_path: Path) -> list[dict]:
    items = []
    swf_paths = sorted([p for p in root_path.rglob('*') if p.is_file() and p.suffix.lower() == '.swf'])
    total = len(swf_paths)
    habbo_diag(f"fallback-scan:start root={root_path} swfCount={total}")
    for idx, swf_path in enumerate(swf_paths, start=1):
        try:
            rel = swf_path.relative_to(root_path).as_posix()
        except Exception:
            continue
        parts = rel.split('/')
        type_name = parts[0].lower() if len(parts) >= 2 else 'room'
        category = parts[1].lower() if len(parts) >= 3 else 'other'
        furni_line = parts[2].lower() if len(parts) >= 4 else 'other'
        classname = swf_path.stem
        icon_path = swf_path.with_suffix('.png')
        items.append({
            'assetId': make_library_asset_id({'classname': classname, 'type': type_name, 'category': category, 'furni_line': furni_line}, rel),
            'prefabId': 'habbo_' + Path(rel).with_suffix('').as_posix().replace('/', '_').replace(' ', '_'),
            'classname': classname,
            'displayName': classname,
            'type': type_name,
            'category': category,
            'furniLine': furni_line,
            'swfRelativePath': rel,
            'iconRelativePath': icon_path.relative_to(root_path).as_posix() if icon_path.exists() else '',
            'hasIcon': icon_path.exists(),
            'tags': [type_name, category, furni_line, classname],
        })
        if idx == 1 or idx % 1000 == 0 or idx == total:
            habbo_diag(f"fallback-scan:progress root={root_path} scanned={idx}/{total} items={len(items)}")
    habbo_diag(f"fallback-scan:done root={root_path} items={len(items)}")
    return items


def load_habbo_library_items(root_path: Path) -> list[dict]:
    index_path = root_path / 'index.json'
    items: list[dict] = []
    if index_path.exists():
        habbo_diag(f"load-items:index-read:start root={root_path} file={index_path}")
        try:
            raw_text = index_path.read_text(encoding='utf-8')
            habbo_diag(f"load-items:index-read:done root={root_path} bytes={len(raw_text)}")
            raw = json.loads(raw_text)
            records = raw if isinstance(raw, list) else raw.get('items') if isinstance(raw, dict) else []
            record_count = len(records) if isinstance(records, list) else 0
            habbo_diag(f"load-items:index-parse:done root={root_path} recordCount={record_count}")
            if isinstance(records, list):
                for idx, record in enumerate(records, start=1):
                    if not isinstance(record, dict):
                        continue
                    item = normalize_library_item(root_path, record)
                    if item:
                        items.append(item)
                    if idx == 1 or idx % 1000 == 0 or idx == record_count:
                        habbo_diag(f"load-items:index-normalize:progress root={root_path} scanned={idx}/{record_count} items={len(items)}")
        except Exception as exc:
            habbo_diag(f"load-items:index-error root={root_path} error={exc}")
            items = []
    if not items:
        habbo_diag(f"load-items:fallback-trigger root={root_path}")
        items = scan_habbo_library_fallback(root_path)
    items.sort(key=lambda x: (x.get('type') or '', x.get('category') or '', x.get('displayName') or '', x.get('classname') or ''))
    habbo_diag(f"load-items:sorted root={root_path} items={len(items)}")
    return items



def get_habbo_library_sig(root_path: Path):
    index_path = root_path / 'index.json'
    try:
        st = index_path.stat() if index_path.exists() else None
        return (str(index_path), st.st_mtime_ns if st else None, st.st_size if st else None)
    except Exception:
        return None


def load_habbo_library_index_records(root_path: Path) -> list[dict]:
    index_path = root_path / 'index.json'
    if not index_path.exists():
        return []
    try:
        root_key = str(root_path.resolve())
    except Exception:
        root_key = str(root_path)
    sig = get_habbo_library_sig(root_path)
    with HABBO_LIBRARY_CACHE_LOCK:
        cached = HABBO_LIBRARY_INDEX_CACHE.get(root_key)
        if cached and cached.get('sig') == sig and isinstance(cached.get('records'), list):
            return cached.get('records') or []
    habbo_diag(f"direct-index:read:start root={root_key} file={index_path}")
    raw_text = index_path.read_text(encoding='utf-8')
    habbo_diag(f"direct-index:read:done root={root_key} bytes={len(raw_text)}")
    raw = json.loads(raw_text)
    records = raw if isinstance(raw, list) else raw.get('items') if isinstance(raw, dict) else []
    payload_kind = 'list' if isinstance(raw, list) else 'dict' if isinstance(raw, dict) else type(raw).__name__
    top_keys = _short_habbo_keys(raw) if isinstance(raw, dict) else []
    record_source = 'root-list' if isinstance(raw, list) else 'payload.items' if isinstance(raw, dict) and isinstance(raw.get('items'), list) else 'none'
    first_record_keys = []
    if isinstance(records, list) and records and isinstance(records[0], dict):
        first_record_keys = sorted(map(str, records[0].keys()))[:16]
    total_items_field = 0
    if isinstance(raw, dict):
        try:
            total_items_field = int(raw.get('totalItems') or (raw.get('summary') or {}).get('totalItems') or 0)
        except Exception:
            total_items_field = 0
    if not isinstance(records, list):
        records = []
    habbo_diag(f"direct-index:parse:done root={root_key} payloadKind={payload_kind} recordSource={record_source} recordCount={len(records)} totalItemsField={total_items_field} topKeys={top_keys} firstRecordKeys={first_record_keys}")
    if total_items_field > 0 and not records:
        habbo_diag(f"direct-index:parse:mismatch root={root_key} totalItemsField={total_items_field} recordCount=0 meaning=summary-without-items-or-unrecognized-structure")
    with HABBO_LIBRARY_CACHE_LOCK:
        HABBO_LIBRARY_INDEX_CACHE[root_key] = {
            'sig': sig,
            'raw': raw,
            'records': records,
            'loadedAtMs': int(time.time() * 1000),
        }
    return records


def load_habbo_library_index_payload(root_path: Path):
    index_path = root_path / 'index.json'
    if not index_path.exists():
        return None
    try:
        root_key = str(root_path.resolve())
    except Exception:
        root_key = str(root_path)
    sig = get_habbo_library_sig(root_path)
    with HABBO_LIBRARY_CACHE_LOCK:
        cached = HABBO_LIBRARY_INDEX_CACHE.get(root_key)
        if cached and cached.get('sig') == sig and 'raw' in cached:
            return cached.get('raw')
    load_habbo_library_index_records(root_path)
    with HABBO_LIBRARY_CACHE_LOCK:
        cached = HABBO_LIBRARY_INDEX_CACHE.get(root_key)
        if cached and cached.get('sig') == sig:
            return cached.get('raw')
    return None


def _normalize_habbo_summary_payload(payload: dict | None) -> dict | None:
    if not isinstance(payload, dict):
        return None
    source = payload.get('summary') if isinstance(payload.get('summary'), dict) else payload
    total_items = source.get('totalItems')
    if total_items is None:
        total_items = source.get('total')
    if total_items is None:
        total_items = source.get('count')
    try:
        total_items = int(total_items or 0)
    except Exception:
        total_items = 0
    totals_by_type = source.get('totalsByType') or {
        'room': int(source.get('roomItems') or source.get('room') or 0),
        'wall': int(source.get('wallItems') or source.get('wall') or 0),
    }
    if not isinstance(totals_by_type, dict):
        totals_by_type = {'room': 0, 'wall': 0}
    categories_room = source.get('categoriesRoom') or source.get('roomCategories') or []
    categories_wall = source.get('categoriesWall') or source.get('wallCategories') or []
    if not isinstance(categories_room, list):
        categories_room = []
    if not isinstance(categories_wall, list):
        categories_wall = []
    if total_items <= 0 and not categories_room and not categories_wall:
        return None
    return {
        'totalItems': total_items,
        'totalsByType': {
            'room': int(totals_by_type.get('room') or 0),
            'wall': int(totals_by_type.get('wall') or 0),
        },
        'categoriesRoom': categories_room,
        'categoriesWall': categories_wall,
    }


def extract_habbo_index_summary(root_path: Path) -> dict | None:
    return _normalize_habbo_summary_payload(load_habbo_library_index_payload(root_path))


def _short_habbo_keys(payload) -> list[str]:
    if not isinstance(payload, dict):
        return []
    keys = sorted(map(str, payload.keys()))
    return keys[:12]


def inspect_habbo_index_payload(root_path: Path) -> dict:
    index_path = root_path / 'index.json'
    diag = {
        'indexExists': index_path.exists(),
        'indexPath': str(index_path),
        'indexSize': 0,
        'indexMtimeMs': 0,
        'payloadKind': 'missing',
        'topLevelKeys': [],
        'itemsFieldKind': 'missing',
        'itemsFieldCount': 0,
        'summaryFieldKeys': [],
        'totalItemsField': 0,
        'recordSource': 'none',
        'firstRecordKeys': [],
    }
    try:
        if index_path.exists():
            stat = index_path.stat()
            diag['indexSize'] = int(stat.st_size or 0)
            diag['indexMtimeMs'] = int(stat.st_mtime * 1000)
    except Exception:
        pass
    payload = load_habbo_library_index_payload(root_path)
    if isinstance(payload, list):
        diag['payloadKind'] = 'list'
        diag['itemsFieldKind'] = 'list-self'
        diag['itemsFieldCount'] = len(payload)
        diag['recordSource'] = 'root-list'
        if payload and isinstance(payload[0], dict):
            diag['firstRecordKeys'] = sorted(map(str, payload[0].keys()))[:16]
        return diag
    if not isinstance(payload, dict):
        return diag
    diag['payloadKind'] = 'dict'
    diag['topLevelKeys'] = _short_habbo_keys(payload)
    if isinstance(payload.get('items'), list):
        diag['itemsFieldKind'] = 'list'
        diag['itemsFieldCount'] = len(payload.get('items') or [])
        diag['recordSource'] = 'payload.items'
        if payload.get('items') and isinstance(payload.get('items')[0], dict):
            diag['firstRecordKeys'] = sorted(map(str, payload.get('items')[0].keys()))[:16]
    elif 'items' in payload:
        diag['itemsFieldKind'] = type(payload.get('items')).__name__
    if isinstance(payload.get('summary'), dict):
        diag['summaryFieldKeys'] = _short_habbo_keys(payload.get('summary'))
    total_items_field = payload.get('totalItems')
    if total_items_field is None and isinstance(payload.get('summary'), dict):
        total_items_field = payload.get('summary', {}).get('totalItems')
    try:
        diag['totalItemsField'] = int(total_items_field or 0)
    except Exception:
        diag['totalItemsField'] = 0
    if diag['recordSource'] == 'none' and diag['totalItemsField'] > 0:
        diag['recordSource'] = 'summary-only-or-custom-structure'
    return diag


def make_habbo_index_debug_payload(root_path: Path, info: dict | None = None, branch: str = '', extra: dict | None = None) -> dict:
    diag = inspect_habbo_index_payload(root_path)
    payload = {
        'branch': branch or 'unknown',
        'rootCount': int((info or {}).get('itemCount') or 0),
        'indexExists': bool(diag.get('indexExists')),
        'indexPath': diag.get('indexPath'),
        'indexSize': int(diag.get('indexSize') or 0),
        'indexMtimeMs': int(diag.get('indexMtimeMs') or 0),
        'payloadKind': diag.get('payloadKind'),
        'topLevelKeys': diag.get('topLevelKeys') or [],
        'itemsFieldKind': diag.get('itemsFieldKind'),
        'itemsFieldCount': int(diag.get('itemsFieldCount') or 0),
        'summaryFieldKeys': diag.get('summaryFieldKeys') or [],
        'totalItemsField': int(diag.get('totalItemsField') or 0),
        'recordSource': diag.get('recordSource') or 'none',
        'firstRecordKeys': diag.get('firstRecordKeys') or [],
    }
    if isinstance(extra, dict):
        payload.update(extra)
    return payload


def habbo_diag_debug(req_id: str, label: str, debug_payload: dict):
    try:
        habbo_diag(
            f"{label} reqId={req_id} branch={debug_payload.get('branch')} rootCount={debug_payload.get('rootCount')} "
            f"indexExists={debug_payload.get('indexExists')} indexSize={debug_payload.get('indexSize')} "
            f"payloadKind={debug_payload.get('payloadKind')} recordSource={debug_payload.get('recordSource')} "
            f"itemsFieldKind={debug_payload.get('itemsFieldKind')} itemsFieldCount={debug_payload.get('itemsFieldCount')} "
            f"totalItemsField={debug_payload.get('totalItemsField')} topKeys={debug_payload.get('topLevelKeys')} summaryKeys={debug_payload.get('summaryFieldKeys')} firstRecordKeys={debug_payload.get('firstRecordKeys')}"
        )
    except Exception:
        pass


def summarize_habbo_library_index_records(root_path: Path) -> dict:
    summary_from_index = extract_habbo_index_summary(root_path)
    if summary_from_index:
        habbo_diag(f"direct-summary:index-summary root={root_path} total={summary_from_index.get('totalItems',0)} roomCats={len(summary_from_index.get('categoriesRoom') or [])} wallCats={len(summary_from_index.get('categoriesWall') or [])}")
        return summary_from_index
    records = load_habbo_library_index_records(root_path)
    totals_by_type: dict[str, int] = {'room': 0, 'wall': 0}
    category_buckets: dict[str, dict[str, dict]] = {'room': {}, 'wall': {}}
    total_items = 0
    record_count = len(records)
    for idx, record in enumerate(records, start=1):
        if not isinstance(record, dict):
            continue
        type_name = _normalize_text_token(record.get('type') or 'room') or 'room'
        category = _normalize_text_token(record.get('category') or 'other') or 'other'
        totals_by_type[type_name] = totals_by_type.get(type_name, 0) + 1
        total_items += 1
        bucket = category_buckets.setdefault(type_name, {}).setdefault(category, {
            'key': category,
            'label': category.replace('_', ' ').replace('-', ' ').title(),
            'count': 0,
            'sampleIconRelativePath': '',
            'sampleSwfRelativePath': '',
        })
        bucket['count'] += 1
        if not bucket['sampleSwfRelativePath']:
            swf_rel, icon_rel = guess_library_entry_paths(root_path, record)
            if swf_rel:
                bucket['sampleSwfRelativePath'] = swf_rel
            if icon_rel:
                bucket['sampleIconRelativePath'] = icon_rel
        if idx == 1 or idx % 5000 == 0 or idx == record_count:
            habbo_diag(f"direct-summary:progress root={root_path} scanned={idx}/{record_count} total={total_items}")
    return {
        'totalItems': total_items,
        'totalsByType': totals_by_type,
        'categoriesRoom': sorted(category_buckets.get('room', {}).values(), key=lambda x: x['key']),
        'categoriesWall': sorted(category_buckets.get('wall', {}).values(), key=lambda x: x['key']),
    }


def query_habbo_library_index_page(root_path: Path, type_name: str, category: str, search: str, page: int, page_size: int) -> dict:
    records = load_habbo_library_index_records(root_path)
    type_name = (type_name or 'room').strip().lower() or 'room'
    category = (category or 'all').strip().lower() or 'all'
    search = (search or '').strip().lower()
    requested_page = max(1, page)
    total = 0
    matched_items: list[dict] = []
    record_count = len(records)
    for idx, record in enumerate(records, start=1):
        if not record_matches_library_query(record, type_name, category, search):
            continue
        item = build_library_item_from_record_fast(root_path, record)
        if not item:
            continue
        matched_items.append(item)
        total += 1
        if idx == 1 or idx % 5000 == 0 or idx == record_count:
            habbo_diag(f"direct-page:progress root={root_path} scanned={idx}/{record_count} matched={total}")
    matched_items.sort(key=lambda x: (x.get('type') or '', x.get('category') or '', x.get('displayName') or '', x.get('classname') or ''))
    total_pages = max(1, math.ceil(total / page_size))
    page = min(requested_page, total_pages)
    start = (page - 1) * page_size
    page_items = matched_items[start:start + page_size]
    return {
        'items': page_items,
        'total': total,
        'page': page,
        'pageSize': page_size,
        'totalPages': total_pages,
    }


def _build_habbo_library_cache(root_path: Path, root_key: str, sig, index_exists: bool):
    started_at = time.perf_counter()
    habbo_diag(f"build:start root={root_key} mode={'classified-index' if index_exists else 'fallback-scan'} sig={sig}")
    try:
        items = load_habbo_library_items(root_path)
        habbo_diag(f"build:items-ready root={root_key} count={len(items)}")
        summary = summarize_habbo_library_items(items)
        habbo_diag(f"build:summary-ready root={root_key} total={summary.get('totalItems',0)} roomCats={len(summary.get('categoriesRoom', []))} wallCats={len(summary.get('categoriesWall', []))}")
        build_ms = round((time.perf_counter() - started_at) * 1000, 1)
        cached = {
            'sig': sig,
            'items': items,
            'summary': summary,
            'buildMs': build_ms,
            'builtAtMs': int(time.time() * 1000),
        }
        with HABBO_LIBRARY_CACHE_LOCK:
            HABBO_LIBRARY_CACHE[root_key] = cached
            HABBO_LIBRARY_CACHE_INFLIGHT.pop(root_key, None)
        habbo_diag(f"build:cache-store root={root_key} buildMs={build_ms}")
        log_server(f"[habbo-cache] rebuilt root={root_key} total={summary.get('totalItems',0)} mode={'classified-index' if index_exists else 'fallback-scan'} buildMs={build_ms}")
    except Exception as exc:
        with HABBO_LIBRARY_CACHE_LOCK:
            HABBO_LIBRARY_CACHE_INFLIGHT[root_key] = {
                'sig': sig,
                'pending': False,
                'error': str(exc),
                'startedAtMs': int(time.time() * 1000),
                'failedAtMs': int(time.time() * 1000),
            }
        habbo_diag(f"build:error root={root_key} error={exc}")
        log_server(f"[habbo-cache] rebuild-error root={root_key} error={exc}")



def get_habbo_library_cache(root_path: Path, async_ok: bool = False) -> dict:
    try:
        root_key = str(root_path.resolve())
    except Exception:
        root_key = str(root_path)
    index_path = root_path / 'index.json'
    index_exists = index_path.exists()
    sig = get_habbo_library_sig(root_path)
    now_ms = int(time.time() * 1000)
    with HABBO_LIBRARY_CACHE_LOCK:
        cached = HABBO_LIBRARY_CACHE.get(root_key)
        if cached and cached.get('sig') == sig:
            habbo_diag(f"cache:hit root={root_key} buildMs={cached.get('buildMs')}")
            return {'ready': True, **cached}

        inflight = HABBO_LIBRARY_CACHE_INFLIGHT.get(root_key)
        if inflight and inflight.get('sig') == sig:
            started_ms = int(inflight.get('startedAtMs') or now_ms)
            state = {
                'startedAtMs': started_ms,
                'elapsedMs': max(0, now_ms - started_ms),
            }
            if inflight.get('pending'):
                habbo_diag(f"cache:pending root={root_key} elapsedMs={state['elapsedMs']}")
                return {'ready': False, 'pending': True, 'buildState': state}
            if inflight.get('error'):
                habbo_diag(f"cache:inflight-error root={root_key} error={inflight.get('error')}")
                raise RuntimeError(str(inflight.get('error')))

        if async_ok:
            HABBO_LIBRARY_CACHE_INFLIGHT[root_key] = {
                'sig': sig,
                'pending': True,
                'startedAtMs': now_ms,
            }
            thread = Thread(
                target=_build_habbo_library_cache,
                args=(root_path, root_key, sig, index_exists),
                daemon=True,
                name='habbo-cache-build',
            )
            thread.start()
            habbo_diag(f"cache:async-start root={root_key} mode={'classified-index' if index_exists else 'fallback-scan'}")
            return {
                'ready': False,
                'pending': True,
                'buildState': {
                    'startedAtMs': now_ms,
                    'elapsedMs': 0,
                },
            }

    habbo_diag(f"cache:sync-build root={root_key} mode={'classified-index' if index_exists else 'fallback-scan'}")
    started_at = time.perf_counter()
    items = load_habbo_library_items(root_path)
    habbo_diag(f"cache:items-ready root={root_key} items={len(items)}")
    summary = summarize_habbo_library_items(items)
    build_ms = round((time.perf_counter() - started_at) * 1000, 1)
    cached = {
        'sig': sig,
        'items': items,
        'summary': summary,
        'buildMs': build_ms,
        'builtAtMs': int(time.time() * 1000),
    }
    with HABBO_LIBRARY_CACHE_LOCK:
        HABBO_LIBRARY_CACHE[root_key] = cached
        HABBO_LIBRARY_CACHE_INFLIGHT.pop(root_key, None)
    habbo_diag(f"cache:sync-ready root={root_key} total={summary.get('totalItems',0)} buildMs={build_ms}")
    log_server(f"[habbo-cache] rebuilt root={root_key} total={summary.get('totalItems',0)} mode={'classified-index' if index_exists else 'fallback-scan'} buildMs={build_ms}")
    return {'ready': True, **cached}


def summarize_habbo_library_items(items: list[dict]) -> dict:

    totals_by_type = {'room': 0, 'wall': 0}
    category_buckets: dict[str, dict[str, dict]] = {'room': {}, 'wall': {}}
    for item in items:
        type_name = str(item.get('type') or 'room').lower() or 'room'
        if type_name not in category_buckets:
            category_buckets[type_name] = {}
            totals_by_type[type_name] = 0
        totals_by_type[type_name] = totals_by_type.get(type_name, 0) + 1
        key = str(item.get('category') or 'other').lower() or 'other'
        bucket = category_buckets[type_name].setdefault(key, {'key': key, 'label': key.replace('_', ' ').replace('-', ' ').title(), 'count': 0, 'sampleIconRelativePath': '', 'sampleSwfRelativePath': ''})
        bucket['count'] += 1
        if not bucket['sampleIconRelativePath'] and item.get('iconRelativePath'):
            bucket['sampleIconRelativePath'] = item.get('iconRelativePath') or ''
        if not bucket['sampleSwfRelativePath'] and item.get('swfRelativePath'):
            bucket['sampleSwfRelativePath'] = item.get('swfRelativePath') or ''
    return {'totalItems': len(items), 'totalsByType': totals_by_type, 'categoriesRoom': sorted(category_buckets.get('room', {}).values(), key=lambda x: x['key']), 'categoriesWall': sorted(category_buckets.get('wall', {}).values(), key=lambda x: x['key'])}

def filter_habbo_library_items(items: list[dict], type_name: str, category: str, search: str) -> list[dict]:
    type_name = (type_name or 'room').strip().lower() or 'room'
    category = (category or 'all').strip().lower() or 'all'
    search = (search or '').strip().lower()
    filtered = []
    for item in items:
        if str(item.get('type') or 'room').lower() != type_name:
            continue
        if category != 'all' and str(item.get('category') or 'other').lower() != category:
            continue
        if search:
            hay = ' '.join([str(item.get('displayName') or ''), str(item.get('classname') or ''), str(item.get('category') or ''), str(item.get('furniLine') or ''), ' '.join(map(str, item.get('tags') or []))]).lower()
            if search not in hay:
                continue
        filtered.append(item)
    return filtered


def guess_content_type(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == '.png':
        return 'image/png'
    if suffix in {'.jpg', '.jpeg'}:
        return 'image/jpeg'
    if suffix == '.webp':
        return 'image/webp'
    if suffix == '.gif':
        return 'image/gif'
    if suffix == '.swf':
        return 'application/x-shockwave-flash'
    return 'application/octet-stream'


class Handler(SimpleHTTPRequestHandler):
    def _json(self, code: int, payload: dict | list):
        data = json.dumps(payload, ensure_ascii=False, indent=2).encode('utf-8')
        parsed_path = ''
        try:
            parsed = urlparse(self.path)
            parsed_path = parsed.path
            if parsed.path.startswith('/api/'):
                p0_server_log('BOUNDARY', 'json-response', {'method': self.command, 'path': parsed.path, 'status': code})
        except Exception:
            pass
        try:
            self.send_response(code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)
            return True
        except Exception as exc:
            if is_client_disconnect_error(exc):
                p1b_server_log('BOUNDARY', 'client-disconnected', {'method': self.command, 'path': parsed_path or self.path, 'status': code, 'during': 'json-write', 'errorClass': exc.__class__.__name__, 'error': str(exc)})
                return False
            raise

    def _bytes(self, code: int, payload: bytes, content_type: str = 'application/octet-stream'):
        parsed_path = ''
        try:
            parsed = urlparse(self.path)
            parsed_path = parsed.path
            if parsed.path.startswith('/api/'):
                p0_server_log('BOUNDARY', 'bytes-response', {'method': self.command, 'path': parsed.path, 'status': code, 'contentType': content_type, 'bytes': len(payload)})
        except Exception:
            pass
        try:
            self.send_response(code)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(payload)
            return True
        except Exception as exc:
            if is_client_disconnect_error(exc):
                p1b_server_log('BOUNDARY', 'client-disconnected', {'method': self.command, 'path': parsed_path or self.path, 'status': code, 'during': 'bytes-write', 'errorClass': exc.__class__.__name__, 'error': str(exc)})
                return False
            raise

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/health':
            return self._json(200, {'ok': True, 'port': PORT, 'role': ROLE, 'root': str(ROOT), 'routeCount': p0_route_counts(), 'routes': P0_ROUTE_REGISTRY})

        if parsed.path == '/api/prefabs/index':
            PREFAB_DIR.mkdir(parents=True, exist_ok=True)
            items = []
            for path in sorted(PREFAB_DIR.glob('*.json')):
                try:
                    raw = path.read_text(encoding='utf-8')
                    data = json.loads(raw)
                except Exception:
                    data = {}
                items.append({
                    'file': path.name,
                    'id': data.get('id', path.stem),
                    'name': data.get('name', data.get('id', path.stem)),
                    'kind': data.get('kind', ''),
                    'mtimeMs': int(path.stat().st_mtime * 1000),
                    'size': path.stat().st_size,
                })
            return self._json(200, {'items': items})

        if parsed.path == '/api/habbo/config':
            info = describe_habbo_root(); log_server(f"[habbo-config:get] root={info.get('root')} exists={info.get('exists')} itemCount={info.get('itemCount')}"); return self._json(200, {'ok': True, **info})

        if parsed.path == '/api/habbo/index':
            info = describe_habbo_root()
            if not info['configured']:
                return self._json(200, {'ok': True, **info, 'items': []})
            if not info['exists']:
                return self._json(404, {'ok': False, **info, 'error': f"Habbo asset root not found: {info['root']}"})
            root_path = read_habbo_root()
            items = iter_habbo_swf_items(root_path)
            return self._json(200, {'ok': True, **info, 'items': items})

        if parsed.path == '/api/habbo/library/index':
            try:
                info = describe_habbo_root()
                if not info['configured']:
                    return self._json(200, {'ok': True, **info, 'items': []})
                if not info['exists']:
                    return self._json(404, {'ok': False, **info, 'error': f"Habbo asset root not found: {info['root']}"})
                query = parse_qs(parsed.query or '')
                root_path = read_habbo_root()
                req_id = (query.get('reqId') or [''])[0] or str(int(time.time() * 1000))
                habbo_diag(f"endpoint:index reqId={req_id} root={root_path}")
                cached = get_habbo_library_cache(root_path, async_ok=True)
                if not cached.get('ready'):
                    build_state = dict(cached.get('buildState') or {})
                    return self._json(200, {'ok': True, **info, 'reqId': req_id, 'items': [], 'pending': True, 'buildState': build_state, 'libraryMode': 'classified-index' if (root_path / 'index.json').exists() else 'fallback-scan'})
                items = cached.get('items', [])
                habbo_diag(f"endpoint:index ready reqId={req_id} root={root_path} items={len(items)} buildMs={cached.get('buildMs')}")
                return self._json(200, {'ok': True, **info, 'reqId': req_id, 'items': items, 'pending': False, 'buildMs': cached.get('buildMs'), 'builtAtMs': cached.get('builtAtMs'), 'libraryMode': 'classified-index' if (root_path / 'index.json').exists() else 'fallback-scan'})
            except Exception as exc:
                req_id = locals().get('req_id', str(int(time.time() * 1000)))
                habbo_diag(f"endpoint:index exception reqId={req_id} path={self.path}")
                return self._json(500, habbo_error_response('library-index', req_id, exc))


        if parsed.path == '/api/habbo/library/summary':
            try:
                info = describe_habbo_root()
                if not info['configured']:
                    return self._json(200, {'ok': True, **info, 'items': [], 'totalItems': 0, 'totalsByType': {'room': 0, 'wall': 0}, 'categoriesRoom': [], 'categoriesWall': []})
                if not info['exists']:
                    return self._json(404, {'ok': False, **info, 'error': f"Habbo asset root not found: {info['root']}"})
                query = parse_qs(parsed.query or '')
                root_path = read_habbo_root()
                req_id = (query.get('reqId') or [''])[0] or str(int(time.time() * 1000))
                habbo_diag(f"endpoint:summary reqId={req_id} root={root_path}")
                index_exists = (root_path / 'index.json').exists()
                if index_exists:
                    probe_debug = make_habbo_index_debug_payload(root_path, info, branch='prefer-existing-index-summary')
                    habbo_diag_debug(req_id, 'endpoint:summary probe', probe_debug)
                    direct_started = time.perf_counter()
                    summary = extract_habbo_index_summary(root_path)
                    branch = 'use-existing-index-summary'
                    if not summary:
                        summary = summarize_habbo_library_index_records(root_path)
                        branch = 'derive-from-index-records-fast'
                    direct_build_ms = round((time.perf_counter() - direct_started) * 1000, 1)
                    summary_total = int((summary or {}).get('totalItems') or 0)
                    debug_payload = make_habbo_index_debug_payload(root_path, info, branch=branch, extra={
                        'summaryTotal': summary_total,
                        'roomCategoryCount': len((summary or {}).get('categoriesRoom') or []),
                        'wallCategoryCount': len((summary or {}).get('categoriesWall') or []),
                        'directBuildMs': direct_build_ms,
                        'buildSkipped': True,
                    })
                    habbo_diag_debug(req_id, 'endpoint:summary result', debug_payload)
                    if int(info.get('itemCount') or 0) > 0 and summary_total <= 0:
                        habbo_diag(f"endpoint:summary inconsistent reqId={req_id} root={root_path} reason=root_count_positive_but_summary_empty rootCount={info.get('itemCount')} recordSource={debug_payload.get('recordSource')} totalItemsField={debug_payload.get('totalItemsField')} itemsFieldCount={debug_payload.get('itemsFieldCount')}")
                    return self._json(200, {'ok': True, **info, 'reqId': req_id, **(summary or {'totalItems': 0, 'totalsByType': {'room': 0, 'wall': 0}, 'categoriesRoom': [], 'categoriesWall': []}), 'pending': False, 'buildSkipped': True, 'buildMs': direct_build_ms, 'builtAtMs': int(time.time() * 1000), 'libraryMode': 'classified-index-direct', 'debug': debug_payload})
                cached = get_habbo_library_cache(root_path, async_ok=True)
                if not cached.get('ready'):
                    build_state = dict(cached.get('buildState') or {})
                    habbo_diag(f"endpoint:summary pending reqId={req_id} root={root_path} elapsedMs={build_state.get('elapsedMs',0)}")
                    return self._json(200, {'ok': True, **info, 'reqId': req_id, 'items': [], 'totalItems': 0, 'totalsByType': {'room': 0, 'wall': 0}, 'categoriesRoom': [], 'categoriesWall': [], 'pending': True, 'buildState': build_state, 'libraryMode': 'fallback-scan'})
                summary = cached.get('summary', {'totalItems': 0, 'totalsByType': {'room': 0, 'wall': 0}, 'categoriesRoom': [], 'categoriesWall': []})
                habbo_diag(f"endpoint:summary ready reqId={req_id} root={root_path} total={summary.get('totalItems',0)} buildMs={cached.get('buildMs')}")
                return self._json(200, {'ok': True, **info, 'reqId': req_id, **summary, 'pending': False, 'buildMs': cached.get('buildMs'), 'builtAtMs': cached.get('builtAtMs'), 'libraryMode': 'fallback-scan'})
            except Exception as exc:
                req_id = locals().get('req_id', str(int(time.time() * 1000)))
                habbo_diag(f"endpoint:summary exception reqId={req_id} path={self.path}")
                return self._json(500, habbo_error_response('library-summary', req_id, exc))


        if parsed.path == '/api/habbo/library/page':
            try:
                info = describe_habbo_root()
                if not info['configured']:
                    return self._json(200, {'ok': True, **info, 'items': [], 'total': 0, 'page': 1, 'pageSize': 1, 'totalPages': 1})
                if not info['exists']:
                    return self._json(404, {'ok': False, **info, 'error': f"Habbo asset root not found: {info['root']}"})
                query = parse_qs(parsed.query or '')
                type_name = (query.get('type') or ['room'])[0]
                category = (query.get('category') or ['all'])[0]
                search = (query.get('search') or [''])[0]
                page = max(1, int((query.get('page') or ['1'])[0] or '1'))
                page_size = max(1, min(200, int((query.get('pageSize') or ['15'])[0] or '15')))
                root_path = read_habbo_root()
                req_id = (query.get('reqId') or [''])[0] or str(int(time.time() * 1000))
                habbo_diag(f"endpoint:page reqId={req_id} root={root_path} type={type_name} category={category} search={search!r} page={page} pageSize={page_size}")
                index_exists = (root_path / 'index.json').exists()
                if index_exists:
                    probe_debug = make_habbo_index_debug_payload(root_path, info, branch='prefer-existing-index-page', extra={'type': type_name, 'category': category, 'search': search, 'page': page, 'pageSize': page_size})
                    habbo_diag_debug(req_id, 'endpoint:page probe', probe_debug)
                    direct_started = time.perf_counter()
                    direct_page = query_habbo_library_index_page(root_path, type_name, category, search, page, page_size)
                    direct_build_ms = round((time.perf_counter() - direct_started) * 1000, 1)
                    page_total = int(direct_page.get('total') or 0)
                    returned_count = len(direct_page.get('items') or [])
                    debug_payload = make_habbo_index_debug_payload(root_path, info, branch='query-existing-index-page-fast', extra={
                        'type': type_name,
                        'category': category,
                        'search': search,
                        'page': int(direct_page.get('page') or page),
                        'pageSize': int(direct_page.get('pageSize') or page_size),
                        'totalPages': int(direct_page.get('totalPages') or 1),
                        'pageTotal': page_total,
                        'returnedCount': returned_count,
                        'directBuildMs': direct_build_ms,
                        'buildSkipped': True,
                    })
                    habbo_diag_debug(req_id, 'endpoint:page result', debug_payload)
                    if int(info.get('itemCount') or 0) > 0 and page_total <= 0 and category != 'all':
                        habbo_diag(f"endpoint:page zero-result reqId={req_id} root={root_path} type={type_name} category={category} search={search!r} recordSource={debug_payload.get('recordSource')} totalItemsField={debug_payload.get('totalItemsField')} itemsFieldCount={debug_payload.get('itemsFieldCount')}")
                    return self._json(200, {'ok': True, **info, 'reqId': req_id, **direct_page, 'pending': False, 'buildSkipped': True, 'buildMs': direct_build_ms, 'builtAtMs': int(time.time() * 1000), 'libraryMode': 'classified-index-direct', 'debug': debug_payload})
                cached = get_habbo_library_cache(root_path, async_ok=True)
                if not cached.get('ready'):
                    build_state = dict(cached.get('buildState') or {})
                    habbo_diag(f"endpoint:page pending reqId={req_id} root={root_path} elapsedMs={build_state.get('elapsedMs',0)}")
                    return self._json(200, {'ok': True, **info, 'reqId': req_id, 'items': [], 'total': 0, 'page': 1, 'pageSize': page_size, 'totalPages': 1, 'pending': True, 'buildState': build_state, 'libraryMode': 'fallback-scan'})
                items = cached.get('items', [])
                habbo_diag(f"endpoint:page filter-start reqId={req_id} root={root_path} items={len(items)}")
                filtered = filter_habbo_library_items(items, type_name, category, search)
                total = len(filtered)
                total_pages = max(1, math.ceil(total / page_size))
                page = min(page, total_pages)
                start = (page - 1) * page_size
                page_items = filtered[start:start + page_size]
                habbo_diag(f"endpoint:page ready reqId={req_id} root={root_path} total={total} page={page}/{total_pages} pageItems={len(page_items)} buildMs={cached.get('buildMs')}")
                return self._json(200, {'ok': True, **info, 'reqId': req_id, 'items': page_items, 'total': total, 'page': page, 'pageSize': page_size, 'totalPages': total_pages, 'buildMs': cached.get('buildMs'), 'builtAtMs': cached.get('builtAtMs'), 'libraryMode': 'fallback-scan'})
            except Exception as exc:
                req_id = locals().get('req_id', str(int(time.time() * 1000)))
                if is_client_disconnect_error(exc):
                    p1b_server_log('BOUNDARY', 'library-page-client-aborted', {'reqId': req_id, 'path': self.path, 'errorClass': exc.__class__.__name__, 'error': str(exc)})
                    return
                habbo_diag(f"endpoint:page exception reqId={req_id} path={self.path}")
                return self._json(500, habbo_error_response('library-page', req_id, exc))


        if parsed.path == '/api/habbo/library/icon':
            query = parse_qs(parsed.query or '')
            requested = (query.get('path') or [''])[0]
            try:
                _, target = resolve_habbo_asset_path(requested)
            except FileNotFoundError as exc:
                return self._json(404, {'ok': False, 'error': str(exc)})
            payload = target.read_bytes()
            return self._bytes(200, payload, guess_content_type(target))

        if parsed.path == '/api/habbo/file':
            query = parse_qs(parsed.query or '')
            requested = (query.get('path') or [''])[0]
            try:
                _, target = resolve_habbo_asset_path(requested)
            except FileNotFoundError as exc:
                return self._json(404, {'ok': False, 'error': str(exc)})
            payload = target.read_bytes()
            return self._bytes(200, payload, 'application/x-shockwave-flash')

        if parsed.path == '/api/scenes/default':
            SCENE_DIR.mkdir(parents=True, exist_ok=True)
            file = read_default_scene_filename()
            if not file:
                return self._json(200, {'ok': True, 'hasDefault': False, 'file': ''})
            target = SCENE_DIR / file
            if not target.exists():
                return self._json(200, {'ok': True, 'hasDefault': False, 'file': file})
            data = json.loads(target.read_text(encoding='utf-8'))
            return self._json(200, {
                'ok': True,
                'hasDefault': True,
                'file': file,
                'path': str(target.relative_to(ROOT)),
                'scene': data,
            })

        if parsed.path == '/api/scenes/load':
            SCENE_DIR.mkdir(parents=True, exist_ok=True)
            query = parse_qs(parsed.query or '')
            requested = sanitize_filename((query.get('file') or [''])[0], 'scene')
            target = SCENE_DIR / requested
            if not target.exists():
                return self._json(404, {'ok': False, 'error': f'scene not found: {requested}'})
            data = json.loads(target.read_text(encoding='utf-8'))
            return self._json(200, {
                'ok': True,
                'file': requested,
                'path': str(target.relative_to(ROOT)),
                'scene': data,
            })

        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/prefabs/save':
            try:
                length = int(self.headers.get('Content-Length', '0'))
                body = self.rfile.read(length)
                payload = json.loads(body.decode('utf-8'))
                prefab = payload.get('prefab')
                if not isinstance(prefab, dict):
                    return self._json(400, {'ok': False, 'error': 'prefab missing'})
                filename = sanitize_filename(
                    payload.get('filename') or prefab.get('id') or 'custom_prefab.json',
                    'custom_prefab',
                )
                PREFAB_DIR.mkdir(parents=True, exist_ok=True)
                target = PREFAB_DIR / filename
                target.write_text(json.dumps(prefab, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                return self._json(200, {'ok': True, 'file': filename, 'path': str(target.relative_to(ROOT))})
            except Exception as exc:
                return self._json(500, {'ok': False, 'error': str(exc)})

        if parsed.path == '/api/scenes/save':
            try:
                length = int(self.headers.get('Content-Length', '0'))
                body = self.rfile.read(length)
                payload = json.loads(body.decode('utf-8'))
                scene = payload.get('scene')
                if not isinstance(scene, dict):
                    return self._json(400, {'ok': False, 'error': 'scene missing'})
                filename = sanitize_filename(payload.get('filename') or 'scene.json', 'scene')
                SCENE_DIR.mkdir(parents=True, exist_ok=True)
                target = SCENE_DIR / filename
                target.write_text(json.dumps(scene, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                if bool(payload.get('setDefault', True)):
                    write_default_scene_filename(filename)
                return self._json(200, {
                    'ok': True,
                    'file': filename,
                    'path': str(target.relative_to(ROOT)),
                    'defaultFile': read_default_scene_filename(),
                })
            except Exception as exc:
                return self._json(500, {'ok': False, 'error': str(exc)})

        if parsed.path == '/api/habbo/config':
            try:
                length = int(self.headers.get('Content-Length', '0'))
                body = self.rfile.read(length)
                payload = json.loads(body.decode('utf-8') or '{}')
                root_value = str(payload.get('root') or '').strip()
                if not root_value:
                    if HABBO_ROOT_META.exists():
                        HABBO_ROOT_META.unlink()
                    info = describe_habbo_root(); log_server(f"[habbo-config:get] root={info.get('root')} exists={info.get('exists')} itemCount={info.get('itemCount')}"); return self._json(200, {'ok': True, **info})
                root_path = normalize_habbo_root(root_value)
                payload = {'root': str(root_path)}
                HABBO_ROOT_META.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                HABBO_LIBRARY_CACHE.pop(str(root_path), None)
                info = describe_habbo_root(root_path)
                log_server(f"[habbo-config:set] root={root_path} exists={info.get('exists')} itemCount={info.get('itemCount')}")
                return self._json(200, {'ok': True, **info})
            except Exception as exc:
                return self._json(500, {'ok': False, 'error': str(exc)})

        if parsed.path == '/api/self-check/text-report':
            try:
                length = int(self.headers.get('Content-Length', '0'))
                body = self.rfile.read(length)
                payload = json.loads(body.decode('utf-8') or '{}')
                SELF_CHECK_REPORT_DIR.mkdir(parents=True, exist_ok=True)
                filename_hint = sanitize_filename(payload.get('filenameHint') or ('self-check-text-' + str(int(time.time() * 1000)) + '.json'), 'self_check_text_report')
                report = payload.get('report')
                if not isinstance(report, dict):
                    report = {
                        'phase': 'P8X',
                        'owner': 'legacy-text-report',
                        'kind': 'text-report',
                        'at': time.strftime('%Y-%m-%dT%H:%M:%S'),
                        'text': str(payload.get('text') or ''),
                    }
                target = SELF_CHECK_REPORT_DIR / filename_hint
                target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                p0_server_log('SUMMARY', 'self-check-report-saved', {'file': filename_hint, 'path': str(target.relative_to(ROOT))})
                return self._json(200, {'ok': True, 'file': filename_hint, 'path': str(target.relative_to(ROOT))})
            except Exception as exc:
                return self._json(500, {'ok': False, 'error': str(exc)})

        if parsed.path == '/api/self-check/report':
            try:
                length = int(self.headers.get('Content-Length', '0'))
                body = self.rfile.read(length)
                payload = json.loads(body.decode('utf-8') or '{}')
                report = payload.get('report')
                if not isinstance(report, dict):
                    return self._json(400, {'ok': False, 'error': 'report missing'})
                SELF_CHECK_REPORT_DIR.mkdir(parents=True, exist_ok=True)
                filename_hint = sanitize_filename(payload.get('filenameHint') or ('self-check-' + str(int(time.time() * 1000)) + '.json'), 'self_check_report')
                target = SELF_CHECK_REPORT_DIR / filename_hint
                target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                p0_server_log('SUMMARY', 'self-check-report-saved', {'file': filename_hint, 'path': str(target.relative_to(ROOT))})
                return self._json(200, {'ok': True, 'file': filename_hint, 'path': str(target.relative_to(ROOT))})
            except Exception as exc:
                return self._json(500, {'ok': False, 'error': str(exc)})

        return self._json(404, {'ok': False, 'error': 'not found'})


if __name__ == '__main__':
    os.chdir(ROOT)
    init_server_logs()
    p0_server_log('BOOT', 'server-starting', {'root': str(ROOT), 'port': PORT, 'role': ROLE, 'logFile': str(SERVER_LOG.relative_to(ROOT)), 'latestLogFile': str(SERVER_LATEST_LOG.relative_to(ROOT))})
    p0_server_log('BOUNDARY', 'routes-registered', {'routes': P0_ROUTE_REGISTRY, 'counts': p0_route_counts()})
    p0_server_log('SUMMARY', 'server-paths', {'prefabDir': str(PREFAB_DIR.relative_to(ROOT)), 'sceneDir': str(SCENE_DIR.relative_to(ROOT)), 'habboRootMeta': str(HABBO_ROOT_META.relative_to(ROOT))})
    p1_server_log('BOOT', 'source-of-truth-ready', {'server': 'server/local_server.py', 'sourceDoc': '001_SOURCE_OF_TRUTH.md', 'deprecatedRootFiles': ['app.js', 'state.js', 'app-shell.js', 'lighting-editor.js']})
    p1_server_log('SUMMARY', 'phase-ready', {'phase': 'P1', 'root': str(ROOT), 'hasRootLocalServer': (ROOT / 'local_server.py').exists(), 'canonicalServerPath': str(Path('server/local_server.py')), 'serverLogDir': str(SERVER_LOG_DIR.relative_to(ROOT)), 'currentLogFile': str(SERVER_LOG.relative_to(ROOT)), 'latestLogFile': str(SERVER_LATEST_LOG.relative_to(ROOT))})
    p2_server_log('SUMMARY', 'namespace-bootstrap', {
        'phase': 'P2-A-fix',
        'scope': 'server-observability-only',
        'frontendOwnsNamespaceBootstrap': True,
        'backendOwnershipChanged': False,
        'notes': ['emit explanatory P2 summary only', 'no backend behavior changes']
    })
    server = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print(f'Serving {ROOT} at http://127.0.0.1:{PORT} role={ROLE}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
