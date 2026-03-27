#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import os
import re
import sys
import hashlib
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

SERVER_LOG = ROOT / 'logs' / f'server-{ROLE}.log'
HABBO_LIBRARY_CACHE: dict[str, dict] = {}


def log_server(msg: str):
    try:
        SERVER_LOG.parent.mkdir(parents=True, exist_ok=True)
        with SERVER_LOG.open('a', encoding='utf-8') as fh:
            fh.write(msg.rstrip() + '\n')
    except Exception:
        pass



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
    for path in sorted(root_path.rglob('*.swf')):
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


def guess_library_entry_paths(root_path: Path, record: dict) -> tuple[str, str]:
    classname = str(record.get('classname') or '').strip()
    dest_dir_rel = safe_rel_to_root(root_path, record.get('dest_dir'))
    swf_rel = (
        safe_rel_to_root(root_path, record.get('copied_swf'))
        or safe_rel_to_root(root_path, record.get('swf'))
        or safe_rel_to_root(root_path, record.get('swf_path'))
    )
    icon_rel = (
        safe_rel_to_root(root_path, record.get('copied_icon'))
        or safe_rel_to_root(root_path, record.get('icon'))
        or safe_rel_to_root(root_path, record.get('icon_path'))
    )
    if dest_dir_rel:
        if not swf_rel:
            swf_rel = _guess_rel_from_dir(dest_dir_rel, classname, '.swf')
        if not icon_rel:
            icon_rel = _guess_rel_from_dir(dest_dir_rel, classname, '.png')
    if swf_rel and not icon_rel:
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


def scan_habbo_library_fallback(root_path: Path) -> list[dict]:
    items = []
    for swf_path in sorted(root_path.rglob('*.swf')):
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
    return items


def load_habbo_library_items(root_path: Path) -> list[dict]:
    index_path = root_path / 'index.json'
    items: list[dict] = []
    if index_path.exists():
        try:
            raw = json.loads(index_path.read_text(encoding='utf-8'))
            records = raw if isinstance(raw, list) else raw.get('items') if isinstance(raw, dict) else []
            if isinstance(records, list):
                for record in records:
                    if not isinstance(record, dict):
                        continue
                    item = normalize_library_item(root_path, record)
                    if item:
                        items.append(item)
        except Exception:
            items = []
    if not items:
        items = scan_habbo_library_fallback(root_path)
    items.sort(key=lambda x: (x.get('type') or '', x.get('category') or '', x.get('displayName') or '', x.get('classname') or ''))
    return items




def get_habbo_library_cache(root_path: Path) -> dict:
    try:
        root_key = str(root_path.resolve())
    except Exception:
        root_key = str(root_path)
    index_path = root_path / 'index.json'
    sig = None
    try:
        st = index_path.stat() if index_path.exists() else None
        sig = (str(index_path), st.st_mtime_ns if st else None, st.st_size if st else None)
    except Exception:
        sig = None
    cached = HABBO_LIBRARY_CACHE.get(root_key)
    if cached and cached.get('sig') == sig:
        return cached
    items = load_habbo_library_items(root_path)
    summary = summarize_habbo_library_items(items)
    cached = {'sig': sig, 'items': items, 'summary': summary}
    HABBO_LIBRARY_CACHE[root_key] = cached
    log_server(f"[habbo-cache] rebuilt root={root_key} total={summary.get('totalItems',0)} mode={'classified-index' if index_path.exists() else 'fallback-scan'}")
    return cached

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
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def _bytes(self, code: int, payload: bytes, content_type: str = 'application/octet-stream'):
        self.send_response(code)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/health':
            return self._json(200, {'ok': True, 'port': PORT, 'role': ROLE, 'root': str(ROOT)})

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
            info = describe_habbo_root()
            if not info['configured']:
                return self._json(200, {'ok': True, **info, 'items': []})
            if not info['exists']:
                return self._json(404, {'ok': False, **info, 'error': f"Habbo asset root not found: {info['root']}"})
            root_path = read_habbo_root()
            cached = get_habbo_library_cache(root_path)
            items = cached.get('items', [])
            return self._json(200, {'ok': True, **info, 'items': items, 'libraryMode': 'classified-index' if (root_path / 'index.json').exists() else 'fallback-scan'})


        if parsed.path == '/api/habbo/library/summary':
            info = describe_habbo_root()
            if not info['configured']:
                return self._json(200, {'ok': True, **info, 'items': [], 'totalItems': 0, 'totalsByType': {'room': 0, 'wall': 0}, 'categoriesRoom': [], 'categoriesWall': []})
            if not info['exists']:
                return self._json(404, {'ok': False, **info, 'error': f"Habbo asset root not found: {info['root']}"})
            root_path = read_habbo_root()
            cached = get_habbo_library_cache(root_path)
            summary = cached.get('summary', {'totalItems': 0, 'totalsByType': {'room': 0, 'wall': 0}, 'categoriesRoom': [], 'categoriesWall': []})
            return self._json(200, {'ok': True, **info, **summary, 'libraryMode': 'classified-index' if (root_path / 'index.json').exists() else 'fallback-scan'})

        if parsed.path == '/api/habbo/library/page':
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
            cached = get_habbo_library_cache(root_path)
            items = cached.get('items', [])
            filtered = filter_habbo_library_items(items, type_name, category, search)
            total = len(filtered)
            total_pages = max(1, math.ceil(total / page_size))
            page = min(page, total_pages)
            start = (page - 1) * page_size
            page_items = filtered[start:start + page_size]
            return self._json(200, {'ok': True, **info, 'items': page_items, 'total': total, 'page': page, 'pageSize': page_size, 'totalPages': total_pages, 'libraryMode': 'classified-index' if (root_path / 'index.json').exists() else 'fallback-scan'})

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

        return self._json(404, {'ok': False, 'error': 'not found'})


if __name__ == '__main__':
    os.chdir(ROOT)
    server = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print(f'Serving {ROOT} at http://127.0.0.1:{PORT} role={ROLE}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
