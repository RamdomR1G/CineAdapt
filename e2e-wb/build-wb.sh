#!/bin/bash
# Compila la PWA apuntando al backend local (http://localhost:4100/api) en dist-wb-<etiqueta>, sin dejar cambios en environment.ts.
# Uso: e2e-wb/build-wb.sh antes
set -e; cd "$(dirname "$0")/.."; ENV=src/environments/environment.ts; cp $ENV /tmp/environment.ts.bak
sed -i "s#apiBase: '[^']*'#apiBase: 'http://localhost:4100/api'#" $ENV
trap 'cp /tmp/environment.ts.bak '$ENV EXIT
npx ng build --output-path dist-wb-$1 2>&1 | tail -12
