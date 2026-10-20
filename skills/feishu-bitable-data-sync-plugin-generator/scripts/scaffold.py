"""Generate an isolated Feishu connector starter without network or overwrite."""
import argparse
import json
from pathlib import Path
import re
import shutil


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    parser.add_argument('--name', default='feishu-data-sync-plugin')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', args.name):
        parser.error('name must use lowercase letters, digits and single hyphens')
    output = Path(args.output).resolve()
    if output.exists():
        parser.error('output already exists; choose a new directory')
    source = Path(__file__).resolve().parent.parent / 'assets' / 'starter'
    if source in output.parents:
        parser.error('output cannot be inside the starter template')
    shutil.copytree(source, output)
    package = output / 'package.json'
    manifest = json.loads(package.read_text(encoding='utf-8'))
    manifest['name'] = args.name
    package.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(output)
    print('Demo adapter only. Run npm test; see README.md for configuration.')


if __name__ == '__main__':
    main()
