"""Create a local diagnostic RML copy with named-part colors; never edit the master."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET


def digest(data):
    return hashlib.sha256(data).hexdigest()


source = Path(sys.argv[1])
destination = Path(sys.argv[2])
if source.resolve() == destination.resolve():
    raise ValueError("Diagnostic output must not overwrite the master")
config_bytes = Path("scripts/yoppo-part-labels.json").read_bytes()
config = json.loads(config_bytes)
source_bytes = (source / "scene.rml").read_bytes()
root = ET.fromstring(source_bytes)
original = copy.deepcopy(root)
mapped = []
for shape in root.iter("Shape"):
    name = shape.get("name", "")
    matches = [(prefix, part) for prefix, part in config["rules"] if name.startswith(prefix)]
    if not matches:
        raise ValueError("Unmapped shape: " + name)
    part = matches[0][1]
    if any(element.tag in ("Image", "RasterAsset") for element in shape.iter()):
        raise ValueError("Raster geometry is not allowed")
    for element in shape.iter():
        if element.tag in ("SolidColor", "GradientStop"):
            old = element.get("colorValue", "")
            if len(old) != 8 or old[:2] == "00":
                raise ValueError("Unsupported empty/transparent diagnostic paint: " + name)
            element.set("colorValue", "FF" + config["colors"][part])
    mapped.append({"name": name, "id": shape.get("id"), "part": part})


def geometry_signature(tree):
    clone = copy.deepcopy(tree)
    for node in clone.iter():
        if node.tag in ("SolidColor", "GradientStop"):
            node.attrib.pop("colorValue", None)
    return ET.tostring(clone)


assert geometry_signature(root) == geometry_signature(original), "Geometry or draw order changed"
destination.mkdir(parents=True, exist_ok=True)
derived = ET.tostring(root, encoding="utf-8", xml_declaration=True)
(destination / "scene.rml").write_bytes(derived)
(destination / "rive.yaml").write_bytes((source / "rive.yaml").read_bytes())
manifest = {
    "sourceSha256": digest(source_bytes),
    "derivedSha256": digest(derived),
    "mappingSha256": digest(config_bytes),
    "geometryAndOrderPreserved": True,
    "diagnosticOnly": True,
    "shapes": mapped,
}
(destination / "label-source.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
assert (source / "scene.rml").read_bytes() == source_bytes
print(json.dumps({"shapes": len(mapped), "sourceSha256": manifest["sourceSha256"], "geometryAndOrderPreserved": True}))
