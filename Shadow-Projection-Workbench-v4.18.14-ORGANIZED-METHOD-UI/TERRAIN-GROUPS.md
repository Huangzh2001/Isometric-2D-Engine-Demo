# Kenney terrain regrouping

Source pack: Kenney Isometric Tiles Landscape (CC0).

The original pack exposes numbered PNG files, not a semantic group.json. The demo had incorrectly treated each numbered PNG as an independent material. v4.3.3 groups visually identical terrain geometry across quarter-turn rotations.

Current grouped subset used by the demo:

- Group A: NE=000, SE=001, SW=002, NW=004
- Group B: NE=003, SE=006, SW=007, NW=011
- Group C: NE=005, SE=009, SW=008, NW=013

Opposite pairs in each group were checked visually: A 000↔002 and 001↔004; B 003↔007 and 006↔011; C 005↔008 and 009↔013.
