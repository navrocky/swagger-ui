/**
 * @prettier
 */
import Sidebar from "./components/Sidebar"
import SidebarLayoutWrapper from "./components/SidebarLayoutWrapper"

const SidebarPlugin = () => ({
  components: {
    Sidebar,
  },
  wrapComponents: {
    BaseLayout: SidebarLayoutWrapper,
  },
})

export default SidebarPlugin
