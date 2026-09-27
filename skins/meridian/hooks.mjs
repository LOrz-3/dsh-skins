/**
 * DeepSeek-Meridian wardrobe hooks - the trusted escape hatch of the v2 skin
 * contract (x-org.linxin666.skin-center/v1alpha1).
 *
 * Loading this module executes nothing: apply() owns every write and registers
 * its retraction through ctx.onCleanup, which the runtime may call zero, one or
 * several times. There is no module-level mutable state, so each activation is
 * independent.
 *
 * The host paints the skin background as an <img> with inline full-bleed styles
 * and, when declared, a scrim <div> beside it, both appended into
 * ctx.layers.background before installHooks runs. Switching an outfit therefore
 * only rewrites that image's src: the host keeps its scrim, its background
 * opacity, blur and wallpaper-priority behaviour untouched.
 *
 * Nothing here talks to the host API: the outfit and the palette are in-skin
 * state, so this works on any install where the hooks facet is served, and it
 * never has to reason about which sibling skins exist.
 */

const OUTFITS = [
  ['knight', '骑士'],
  ['suit', '西装'],
  ['swim', '盛夏'],
  ['chef', '甜点师'],
  ['doctor', '主治'],
]

const PALETTES = [
  ['base', '原色'],
  ['clau', 'ClauMeridian'],
  ['gp', 'GPMeridian'],
]

const STORE_KEY = 'meridian.wardrobe.v1'
const BODY_ATTRS = ['data-mw-art', 'data-mw-outfit', 'data-mw-palette', 'data-meridian-hooked']

export default function defineSkinHooks() {
  return {
    apply(ctx) {
      const doc = ctx.layers.foreground.ownerDocument
      const win = doc.defaultView
      const state = { outfit: 'knight', palette: 'base' }

      try {
        const raw = win.localStorage.getItem(STORE_KEY)
        const saved = raw === null ? null : JSON.parse(raw)
        if (saved && typeof saved === 'object') {
          if (OUTFITS.some(([key]) => key === saved.outfit)) state.outfit = saved.outfit
          if (PALETTES.some(([key]) => key === saved.palette)) state.palette = saved.palette
        }
      } catch (error) {
        /* unreadable storage is not a reason to skip the wardrobe */
      }

      const artKey = () => (state.palette === 'base' ? state.outfit : state.palette)
      const theme = () => (ctx.theme.get() === 'dark' ? 'dark' : 'light')

      // Absent when the host suppressed skin media because the user has a
      // wallpaper or a manual background taking priority; then we change nothing
      // and the priority rule keeps holding.
      const backgroundImg = () => ctx.layers.background.querySelector('img')

      const paint = () => {
        const img = backgroundImg()
        if (img) img.src = ctx.assetBase + '/assets/background-' + artKey() + '-' + theme() + '.jpg'
      }

      const apply = () => {
        doc.body.setAttribute('data-mw-art', artKey())
        doc.body.setAttribute('data-mw-outfit', state.outfit)
        if (state.palette === 'base') doc.body.removeAttribute('data-mw-palette')
        else doc.body.setAttribute('data-mw-palette', state.palette)
        paint()
      }

      const persist = () => {
        try {
          win.localStorage.setItem(STORE_KEY, JSON.stringify(state))
        } catch (error) {
          /* a full or blocked store only costs persistence across reloads */
        }
      }

      const root = doc.createElement('div')
      root.setAttribute('data-meridian-wardrobe', '')

      const head = doc.createElement('div')
      head.className = 'mw-head'
      head.textContent = '换装 / 配色'
      root.appendChild(head)

      const outfitRow = doc.createElement('div')
      outfitRow.className = 'mw-row'
      const paletteRow = doc.createElement('div')
      paletteRow.className = 'mw-row'
      root.appendChild(outfitRow)
      root.appendChild(paletteRow)

      const note = doc.createElement('div')
      note.className = 'mw-note'
      note.textContent = '点击即换，记忆在本机'
      root.appendChild(note)

      const buttons = []

      const markCurrent = () => {
        for (const [group, key, button] of buttons) {
          const current = group === 'outfit' ? state.outfit : state.palette
          if (key === current) button.setAttribute('aria-current', 'true')
          else button.removeAttribute('aria-current')
        }
      }

      const pick = (group, key) => {
        if (group === 'outfit') {
          state.outfit = key
          // the recolour palettes ship hero-only artwork, so an outfit pick
          // returns to the stock palette rather than mismatching the art
          state.palette = 'base'
        } else {
          state.palette = key
          if (key !== 'base') state.outfit = 'knight'
        }
        apply()
        markCurrent()
        persist()
      }

      const addButton = (row, group, key, label) => {
        const button = doc.createElement('button')
        button.type = 'button'
        button.textContent = label
        button.addEventListener('click', () => pick(group, key))
        row.appendChild(button)
        buttons.push([group, key, button])
      }

      for (const [key, label] of OUTFITS) addButton(outfitRow, 'outfit', key, label)
      for (const [key, label] of PALETTES) addButton(paletteRow, 'palette', key, label)

      apply()
      markCurrent()
      root.appendChild(note)
      ctx.layers.foreground.appendChild(root)
      doc.body.setAttribute('data-meridian-hooked', '')

      const unsubscribe = ctx.theme.subscribe(paint)

      ctx.onCleanup(() => {
        unsubscribe()
        root.remove()
        for (const attr of BODY_ATTRS) doc.body.removeAttribute(attr)
      })
    },
  }
}
