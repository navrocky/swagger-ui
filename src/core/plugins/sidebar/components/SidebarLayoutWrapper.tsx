/**
 * @prettier
 */
import React from "react"

export interface SidebarSystem {
  getComponent: (name: string, container?: boolean) => React.ComponentType
  getConfigs: () => { sidebar?: boolean }
  specSelectors: {
    loadingStatus: () => string | undefined
    specStr: () => string | undefined
  }
}

const SidebarLayoutWrapper =
  (Original: React.ComponentType, system: SidebarSystem) =>
  (props: Record<string, unknown>) => {
    const { sidebar } = system.getConfigs()
    const isLoaded =
      system.specSelectors.loadingStatus() === "success" &&
      !!system.specSelectors.specStr()

    if (!sidebar || !isLoaded) {
      return <Original {...props} />
    }

    const Sidebar = system.getComponent("Sidebar", true)

    return (
      <div className="swagger-ui swagger-ui--with-sidebar">
        <Sidebar />
        <div className="sidebar-layout__main">
          <Original {...props} />
        </div>
      </div>
    )
  }

export default SidebarLayoutWrapper
