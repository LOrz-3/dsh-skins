// One-command installer for the meridian skin.
//
// Why this exists: DSH only runs a skin's hooks when the skin is either builtin
// or carries market provenance. Copying skins/meridian into ~/.dsh/skins/ by
// hand produces a user-origin skin, and the host refuses its hooks - so the
// wardrobe switcher never appears and only the default knight outfit shows.
// This script installs the skin as a BUILTIN of the skin-center package
// instead, which is the path that actually loads the hooks.
//
// Two things have to happen for a builtin skin to work:
//   1. the files are copied into <skin-center>/skins/<id>/
//   2. <skin-center>/package.json "files" lists "skins/<id>"
// Step 2 is not optional and is easy to miss: the catalog route filters builtin
// skins through the package's own file whitelist, so a builtin skin that is not
// listed there is invisible in the UI even though its files are present.
//
// Usage:
//   node install-meridian.mjs              install into every profile found
//   node install-meridian.mjs --force      re-copy even if already installed
//   node install-meridian.mjs --dry-run    report what would change
//   node install-meridian.mjs --uninstall  remove it and restore package.json
//
// Re-running is safe. A plugin update wipes both changes, so re-run afterwards.

import { cpSync, existsSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SKIN_ID = 'meridian'
const PACKAGE = '@linxin666/dsh-client-ui-skin-center'
const BACKUP_SUFFIX = '.meridian-install-backup'

const HERE = dirname(fileURLToPath(import.meta.url))
const SOURCE = join(HERE, 'skins', SKIN_ID)
const DSH_HOME = process.env.DSH_HOME ?? join(homedir(), '.dsh')

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')
const UNINSTALL = argv.includes('--uninstall')
const FORCE = argv.includes('--force')

const say = (msg) => console.log(msg)

function profileDirs() {
  const root = join(DSH_HOME, 'profiles')
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(root, e.name))
    .filter((dir) => existsSync(join(dir, 'node_modules', PACKAGE)))
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function install(profileDir) {
  const pkgDir = join(profileDir, 'node_modules', PACKAGE)
  const target = join(pkgDir, 'skins', SKIN_ID)
  const pkgJsonPath = join(pkgDir, 'package.json')
  const backupPath = pkgJsonPath + BACKUP_SUFFIX
  const label = profileDir.split(/[\\/]/).pop()

  if (!existsSync(SOURCE)) {
    say(`  [${label}] SKIP - skins/${SKIN_ID} not found next to this script`)
    return false
  }

  const pkg = readJson(pkgJsonPath)
  const files = Array.isArray(pkg.files) ? pkg.files : []
  const entry = `skins/${SKIN_ID}`
  const listed = files.includes(entry)
  const present = existsSync(target)

  if (UNINSTALL) {
    if (existsSync(backupPath)) {
      if (!DRY_RUN) renameSync(backupPath, pkgJsonPath)
      say(`  [${label}] package.json restored from backup`)
    } else if (listed) {
      pkg.files = files.filter((f) => f !== entry)
      if (!DRY_RUN) writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n')
      say(`  [${label}] removed "${entry}" from package.json files`)
    } else {
      say(`  [${label}] package.json unchanged (nothing to undo)`)
    }
    if (present) {
      if (!DRY_RUN) rmSync(target, { recursive: true, force: true })
      say(`  [${label}] removed ${target}`)
    }
    return true
  }

  // Already in place: stop here rather than re-copying. Replacing the directory
  // removes it for an instant, and a running host that notices the skin's files
  // disappearing clears the active selection - so an idempotent run should not
  // touch anything. --force re-copies when the content actually needs updating.
  if (present && listed && !FORCE) {
    say(`  [${label}] already installed - nothing to do (use --force to re-copy)`)
    return true
  }

  // back up once, so a later update can always be rolled back
  if (!existsSync(backupPath) && !DRY_RUN) {
    cpSync(pkgJsonPath, backupPath)
  }

  if (!listed) {
    pkg.files = [...files, entry]
    if (!DRY_RUN) writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n')
    say(`  [${label}] package.json files += "${entry}"  (backup: package.json${BACKUP_SUFFIX})`)
  }

  if (!DRY_RUN) {
    rmSync(target, { recursive: true, force: true })
    cpSync(SOURCE, target, { recursive: true })
  }
  const count = DRY_RUN ? 0 : readdirSync(target).length
  say(`  [${label}] skins/${SKIN_ID} -> ${target}${DRY_RUN ? ' (dry run)' : ` (${count} entries)`}`)
  return true
}

say(`DSH home: ${DSH_HOME}`)
const profiles = profileDirs()
if (profiles.length === 0) {
  say(`No profile with ${PACKAGE} found. Is DSH installed for this user?`)
  process.exit(1)
}

say(`${UNINSTALL ? 'Uninstalling' : 'Installing'} ${SKIN_ID} into ${profiles.length} profile(s)`)
let touched = 0
for (const dir of profiles) if (install(dir)) touched += 1

if (!UNINSTALL && touched > 0) {
  say('')
  say('Done. Now reload DSH so the catalog is rebuilt:')
  say('  - restart the DSH host, or')
  say('  - reload the skin-center plugin')
  say('')
  say('The skin list is computed when the plugin activates, so a running host')
  say('will not show the new skin until one of those happens.')
  say('Then open Settings, pick the skin, and use the wardrobe panel in the')
  say('lower-left corner of the sidebar to switch outfits and palettes.')
}
if (DRY_RUN) say('(dry run - nothing was written)')
