/**
 * @prettier
 */
import { escapeDeepLinkPath } from "core/utils"

export type SidebarKey =
  | ["operations-tag", string]
  | ["operations", string, string]

export interface SidebarLayoutActions {
  show: (key: string[], shown: boolean) => void
  scrollTo: (key: string[]) => void
  scrollToElement: (ref: Element, container?: Element) => void
  scrollToVirtualizedOperation: (key: string[]) => void
  scrollToVirtualizedSchema: (name: string) => void
}

/**
 * Builds the DOM id Swagger UI assigns to a tag header or an operation block.
 * Mirrors `operation-tag.jsx` and `operation.jsx`.
 */
export const domIdFromKey = (key: SidebarKey): string =>
  key[0] === "operations-tag"
    ? key.map((part) => escapeDeepLinkPath(part)).join("-")
    : escapeDeepLinkPath(key.join("-"))

/**
 * Expands the tag that holds the target and smoothly scrolls the page to it.
 *
 * If the target is already rendered, it is scrolled to directly. Otherwise
 * (the tag was collapsed, or the operation list is virtualized) the scroll is
 * deferred to the deep-linking machinery, which performs it once the target
 * mounts.
 */
export const navigateTo = (
  layoutActions: SidebarLayoutActions,
  key: SidebarKey,
  root?: Element | null
): void => {
  const tagKey = ["operations-tag", key[1]]
  layoutActions.show(tagKey, true)

  const el = document.getElementById(domIdFromKey(key))

  if (el && (!root || root.contains(el))) {
    layoutActions.scrollToElement(el)
    return
  }

  layoutActions.scrollTo(key)
  layoutActions.scrollToVirtualizedOperation(key)
}

export interface SchemaTarget {
  /** `["definitions"]` for Swagger 2, `["components", "schemas"]` otherwise. */
  specPathBase: string[]
  /** Omitted to target the schemas section itself. */
  name?: string
  /** Position of the schema in the section, in spec order. */
  index?: number
  /** OAS 3.1+ renders schemas with JSON Schema 2020-12 components. */
  isJSONSchema202012: boolean
  isVirtualized: boolean
}

const findSchemaElement = (
  root: ParentNode,
  { name, index, isJSONSchema202012 }: SchemaTarget
): Element | null => {
  const section = root.querySelector("section.models")

  if (!section || name === undefined) return section

  if (!isJSONSchema202012) {
    const el = document.getElementById(`model-${name}`)
    return el && section.contains(el) ? el : null
  }

  // JSON Schema 2020-12 schemas carry no id; they are rendered in spec order.
  const items = section.querySelectorAll(
    ".json-schema-2020-12[data-json-schema-level='0']"
  )
  return index === undefined ? null : (items[index] ?? null)
}

/**
 * Opens the schemas section and smoothly scrolls the page to a schema
 * (or to the section when no name is given).
 */
export const navigateToSchema = (
  layoutActions: SidebarLayoutActions,
  target: SchemaTarget,
  root?: Element | null
): void => {
  const { specPathBase, name, isVirtualized } = target
  layoutActions.show(specPathBase, true)

  if (name !== undefined && isVirtualized) {
    // The schema list scrolls on its own; let it bring the item into view.
    layoutActions.scrollToVirtualizedSchema(name)
    return
  }

  const el = findSchemaElement(root ?? document, target)

  if (el) {
    layoutActions.scrollToElement(el)
    return
  }

  layoutActions.scrollTo(
    name === undefined ? specPathBase : [...specPathBase, name]
  )
}
