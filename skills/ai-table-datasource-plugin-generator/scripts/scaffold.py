"""Create a runnable starter without downloading packages or overwriting files."""
import argparse
import json
import re
import shutil
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    parser.add_argument('--name', default='dingtalk-datasource-plugin')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', args.name):
        parser.error('--name must use lowercase letters, digits and single hyphens')
    destination = Path(args.output).resolve()
    if destination.exists():
        parser.error('output already exists; select a new directory')
    source = Path(__file__).resolve().parent.parent / 'assets' / 'starter'
    shutil.copytree(source, destination)
    manifest = destination / 'package.json'
    data = json.loads(manifest.read_text(encoding='utf-8'))
    data['name'] = args.name
    manifest.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')
    print(destination)
    print('Demo adapter generated. Run npm test; see README.md for next steps.')


if __name__ == '__main__':
    main()
