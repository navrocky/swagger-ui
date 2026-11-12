/**
 * @prettier
 */
import React, { useCallback, useEffect, useRef, useState } from "react"
import type { List, Map as ImMap, OrderedMap } from "immutable"
import { opId } from "swagger-client/es/helpers"
import { VIRTUALIZE_MODELS_THRESHOLD } from "core/utils/virtualization"
import {
  navigateTo,
  navigateToSchema,
  SchemaTarget,
  SidebarKey,
  SidebarLayoutActions,
} from "../scroll"

type ImOperation = ImMap<string, unknown>
type ImTagObj = ImMap<string, unknown>

export interface SidebarProps {
  specSelectors: {
    taggedOperations: () => OrderedMap<string, ImTagObj>
    validOperationMethods: () => List<string>
    specJson: () => ImMap<string, unknown>
    isOAS3: () => boolean
    isOAS31: () => boolean
    isOAS32?: () => boolean
  }
  layoutActions: SidebarLayoutActions
  getConfigs: () => { defaultModelsExpandDepth?: number }
}

type NavTarget =
  | { type: "operations"; key: SidebarKey }
  | { type: "schema"; schema: SchemaTarget }

interface SidebarEntry {
  id: string
  target: NavTarget
  label: string
  method?: string
  title?: string
  deprecated?: boolean
}

interface SidebarGroupData {
  id: string
  title: string
  target: NavTarget
  entries: SidebarEntry[]
}

type OnNavigate = (id: string, target: NavTarget) => void

// Same derivation as `OperationContainer`, so keys match the rendered blocks.
const getOperationId = (op: ImOperation, path: string, method: string) =>
  op.getIn(["operation", "__originalOperationId"]) ||
  op.getIn(["operation", "operationId"]) ||
  opId(op.get("operation"), path, method) ||
  op.get("id")

const keyToString = (key: SidebarKey) => JSON.stringify(key)

interface ItemProps {
  entry: SidebarEntry
  isActive: boolean
  onNavigate: OnNavigate
}

const SidebarItem: React.FC<ItemProps> = ({ entry, isActive, onNavigate }) => {
  const { id, target, label, method, title, deprecated } = entry
  const handleClick = useCallback(
    () => onNavigate(id, target),
    [onNavigate, id, target]
  )

  const className = ["sidebar__operation"]
  if (!method) className.push("sidebar__operation--schema")
  if (isActive) className.push("is-active")
  if (deprecated) className.push("is-deprecated")

  return (
    <li>
      <button
        type="button"
        className={className.join(" ")}
        title={title ?? label}
        onClick={handleClick}
      >
        {method && (
          <span className={`sidebar__method sidebar__method--${method}`}>
            {method.toUpperCase()}
          </span>
        )}
        <span className="sidebar__path">{label}</span>
      </button>
    </li>
  )
}

interface GroupProps {
  group: SidebarGroupData
  activeKey: string | null
  onNavigate: OnNavigate
}

const SidebarGroup: React.FC<GroupProps> = ({
  group,
  activeKey,
  onNavigate,
}) => {
  const { id, title, target, entries } = group
  const [isCollapsed, setCollapsed] = useState(false)

  const handleToggle = useCallback(() => setCollapsed((v) => !v), [])
  const handleNavigate = useCallback(
    () => onNavigate(id, target),
    [onNavigate, id, target]
  )

  return (
    <li className="sidebar__group" data-group={id}>
      <div className="sidebar__group-header">
        <button
          type="button"
          className={`sidebar__group-toggle${isCollapsed ? " is-collapsed" : ""}`}
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${title}`}
          onClick={handleToggle}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M2 3.5 L5 6.5 L8 3.5" />
          </svg>
        </button>
        <button
          type="button"
          className={`sidebar__group-title${activeKey === id ? " is-active" : ""}`}
          title={title}
          onClick={handleNavigate}
        >
          {title}
        </button>
      </div>
      {!isCollapsed && entries.length > 0 && (
        <ul className="sidebar__operations">
          {entries.map((entry) => (
            <SidebarItem
              key={entry.id}
              entry={entry}
              isActive={activeKey === entry.id}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

const getOperationGroups = (
  specSelectors: SidebarProps["specSelectors"]
): SidebarGroupData[] => {
  const taggedOps = specSelectors.taggedOperations()
  const validMethods = specSelectors.validOperationMethods()

  if (!taggedOps) return []

  return taggedOps
    .entrySeq()
    .map(([tag, tagObj]) => {
      const entries: SidebarEntry[] = []

      ;(tagObj.get("operations") as List<ImOperation>).forEach((op) => {
        const method = op.get("method") as string
        const path = op.get("path") as string

        if (validMethods.indexOf(method) === -1) return

        const operationId = String(getOperationId(op, path, method))
        const key: SidebarKey = ["operations", tag, operationId]
        const summary = op.getIn(["operation", "summary"]) as string | undefined

        entries.push({
          id: keyToString(key),
          target: { type: "operations", key },
          label: path,
          method,
          title: summary ? `${summary}\n${path}` : path,
          deprecated: !!op.getIn(["operation", "deprecated"]),
        })
      })

      const tagKey: SidebarKey = ["operations-tag", tag]

      return {
        id: keyToString(tagKey),
        title: tag,
        target: { type: "operations", key: tagKey } as NavTarget,
        entries,
      }
    })
    .toArray()
}

const getSchemasGroup = (
  specSelectors: SidebarProps["specSelectors"],
  getConfigs: SidebarProps["getConfigs"]
): SidebarGroupData | null => {
  const { defaultModelsExpandDepth = 1 } = getConfigs?.() ?? {}

  // The schemas section is not rendered at all in this case.
  if (defaultModelsExpandDepth < 0) return null

  const isOAS3 = specSelectors.isOAS3()
  const specPathBase = isOAS3 ? ["components", "schemas"] : ["definitions"]
  const schemas = specSelectors.specJson().getIn(specPathBase) as
    | ImMap<string, unknown>
    | undefined

  if (!schemas || typeof schemas.keySeq !== "function" || !schemas.size) {
    return null
  }

  const common = {
    specPathBase,
    isJSONSchema202012: specSelectors.isOAS31() || !!specSelectors.isOAS32?.(),
    isVirtualized: schemas.size >= VIRTUALIZE_MODELS_THRESHOLD,
  }

  const entries = schemas
    .keySeq()
    .toArray()
    .map((name, index) => ({
      id: `schema:${name}`,
      target: {
        type: "schema",
        schema: { ...common, name, index },
      } as NavTarget,
      label: name,
    }))

  return {
    id: "schemas",
    title: isOAS3 ? "Schemas" : "Models",
    target: { type: "schema", schema: common },
    entries,
  }
}

const Sidebar = ({
  specSelectors,
  layoutActions,
  getConfigs,
}: SidebarProps) => {
  const rootRef = useRef<HTMLElement>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  // Only has a visual effect in the narrow layout, where the sidebar becomes
  // a floating drawer; on wide screens it is always shown inline.
  const [isOpen, setOpen] = useState(false)

  const handleOpen = useCallback(() => setOpen(true), [])
  const handleClose = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isOpen])

  const handleNavigate = useCallback<OnNavigate>(
    (id, target) => {
      setActiveKey(id)
      setOpen(false)

      const root = rootRef.current?.closest(".swagger-ui--with-sidebar")

      if (target.type === "operations") {
        navigateTo(layoutActions, target.key, root)
      } else {
        navigateToSchema(layoutActions, target.schema, root)
      }
    },
    [layoutActions]
  )

  const groups = getOperationGroups(specSelectors)
  const schemasGroup = getSchemasGroup(specSelectors, getConfigs)
  if (schemasGroup) groups.push(schemasGroup)

  if (groups.length === 0) {
    return null
  }

  return (
    <>
      <button
        type="button"
        className="sidebar-toggle"
        aria-label="Open API navigation"
        aria-expanded={isOpen}
        onClick={handleOpen}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>
      {isOpen && (
        <div className="sidebar-backdrop" aria-hidden onClick={handleClose} />
      )}
      <aside
        className={`sidebar${isOpen ? " is-open" : ""}`}
        ref={rootRef}
        aria-label="API navigation"
      >
        <div className="sidebar__drawer-header">
          <span className="sidebar__drawer-title">Navigation</span>
          <button
            type="button"
            className="sidebar__drawer-close"
            aria-label="Close API navigation"
            onClick={handleClose}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>
        <nav>
          <ul className="sidebar__groups">
            {groups.map((group) => (
              <SidebarGroup
                key={group.id}
                group={group}
                activeKey={activeKey}
                onNavigate={handleNavigate}
              />
            ))}
          </ul>
        </nav>
      </aside>
    </>
  )
}

export default Sidebar
