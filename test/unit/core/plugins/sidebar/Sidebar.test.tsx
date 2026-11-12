/**
 * @prettier
 */
import React from "react"
import { act } from "react-dom/test-utils"
import { mount } from "enzyme"
import { fromJS, List } from "immutable"
import Sidebar from "core/plugins/sidebar/components/Sidebar"
import {
  domIdFromKey,
  navigateTo,
  navigateToSchema,
} from "core/plugins/sidebar/scroll"

// The ESM build is not transformed by Jest; use the CommonJS one instead.
jest.mock("swagger-client/es/helpers", () =>
  jest.requireActual("swagger-client/lib/helpers")
)

const makeLayoutActions = () => ({
  show: jest.fn(),
  scrollTo: jest.fn(),
  scrollToElement: jest.fn(),
  scrollToVirtualizedOperation: jest.fn(),
  scrollToVirtualizedSchema: jest.fn(),
})

const taggedOperations = fromJS({
  pet: {
    tagDetails: { name: "pet" },
    operations: [
      {
        path: "/pet/{petId}",
        method: "get",
        operation: { operationId: "getPetById", summary: "Find pet by ID" },
      },
      {
        path: "/pet",
        method: "post",
        operation: { operationId: "addPet", deprecated: true },
      },
      {
        path: "/pet",
        method: "unknown",
        operation: { operationId: "ignored" },
      },
    ],
  },
  "store orders": {
    tagDetails: { name: "store orders" },
    operations: [
      {
        path: "/store/order",
        method: "put",
        operation: {},
      },
    ],
  },
})

const makeProps = ({
  specJson = {},
  isOAS3 = false,
  isOAS31 = false,
  defaultModelsExpandDepth = 1,
}: {
  specJson?: object
  isOAS3?: boolean
  isOAS31?: boolean
  defaultModelsExpandDepth?: number
} = {}) => ({
  specSelectors: {
    taggedOperations: () => taggedOperations,
    validOperationMethods: () => List(["get", "post", "put"]),
    specJson: () => fromJS(specJson),
    isOAS3: () => isOAS3,
    isOAS31: () => isOAS31,
  },
  layoutActions: makeLayoutActions(),
  getConfigs: () => ({ defaultModelsExpandDepth }),
})

describe("<Sidebar/>", () => {
  it("renders groups with method badges and paths", () => {
    const wrapper = mount(<Sidebar {...makeProps()} />)

    const titles = wrapper.find(".sidebar__group-title")
    expect(titles.map((n) => n.text())).toEqual(["pet", "store orders"])

    const ops = wrapper.find(".sidebar__operation")
    expect(ops).toHaveLength(3)
    expect(ops.at(0).find(".sidebar__method--get").text()).toEqual("GET")
    expect(ops.at(0).find(".sidebar__path").text()).toEqual("/pet/{petId}")
    expect(ops.at(0).prop("title")).toEqual("Find pet by ID\n/pet/{petId}")
    expect(ops.at(1).hasClass("is-deprecated")).toBe(true)
  })

  it("renders nothing when there are no operations", () => {
    const props = makeProps()
    props.specSelectors.taggedOperations = () => fromJS({})
    const wrapper = mount(<Sidebar {...props} />)

    expect(wrapper.find(".sidebar")).toHaveLength(0)
  })

  it("collapses a group without touching the page", () => {
    const props = makeProps()
    const wrapper = mount(<Sidebar {...props} />)

    wrapper.find(".sidebar__group-toggle").at(0).simulate("click")

    expect(wrapper.find(".sidebar__operation")).toHaveLength(1)
    expect(props.layoutActions.show).not.toHaveBeenCalled()
  })

  it("expands the tag and defers the scroll to an operation not yet rendered", () => {
    const props = makeProps()
    const wrapper = mount(<Sidebar {...props} />)

    wrapper.find(".sidebar__operation").at(0).simulate("click")

    const key = ["operations", "pet", "getPetById"]
    expect(props.layoutActions.show).toHaveBeenCalledWith(
      ["operations-tag", "pet"],
      true
    )
    expect(props.layoutActions.scrollTo).toHaveBeenCalledWith(key)
    expect(
      props.layoutActions.scrollToVirtualizedOperation
    ).toHaveBeenCalledWith(key)
    expect(
      wrapper.find(".sidebar__operation").at(0).hasClass("is-active")
    ).toBe(true)
  })

  it("derives an operationId from path and method when none is set", () => {
    const props = makeProps()
    const wrapper = mount(<Sidebar {...props} />)

    wrapper.find(".sidebar__operation").at(2).simulate("click")

    expect(props.layoutActions.scrollTo).toHaveBeenCalledWith([
      "operations",
      "store orders",
      "put_store_order",
    ])
  })
})

describe("<Sidebar/> schemas", () => {
  const oas3Json = {
    components: { schemas: { Pet: {}, Order: {} } },
  }

  it("lists OpenAPI 3 schemas in a trailing group", () => {
    const wrapper = mount(
      <Sidebar {...makeProps({ specJson: oas3Json, isOAS3: true })} />
    )

    const groups = wrapper.find(".sidebar__group")
    expect(groups.last().prop("data-group")).toEqual("schemas")
    expect(groups.last().find(".sidebar__group-title").text()).toEqual(
      "Schemas"
    )
    expect(
      groups
        .last()
        .find(".sidebar__operation--schema")
        .map((n) => n.text())
    ).toEqual(["Pet", "Order"])
  })

  it("labels Swagger 2 definitions as Models", () => {
    const wrapper = mount(
      <Sidebar {...makeProps({ specJson: { definitions: { Pet: {} } } })} />
    )

    expect(wrapper.find(".sidebar__group-title").last().text()).toEqual(
      "Models"
    )
  })

  it("omits the group when models are hidden or absent", () => {
    const hidden = mount(
      <Sidebar
        {...makeProps({
          specJson: oas3Json,
          isOAS3: true,
          defaultModelsExpandDepth: -1,
        })}
      />
    )
    const absent = mount(<Sidebar {...makeProps({ isOAS3: true })} />)

    expect(hidden.find("[data-group='schemas']")).toHaveLength(0)
    expect(absent.find("[data-group='schemas']")).toHaveLength(0)
  })

  it("opens the schemas section and defers the scroll to a schema", () => {
    const props = makeProps({ specJson: oas3Json, isOAS3: true })
    const wrapper = mount(<Sidebar {...props} />)

    wrapper.find(".sidebar__operation--schema").at(1).simulate("click")

    expect(props.layoutActions.show).toHaveBeenCalledWith(
      ["components", "schemas"],
      true
    )
    expect(props.layoutActions.scrollTo).toHaveBeenCalledWith([
      "components",
      "schemas",
      "Order",
    ])
  })
})

describe("<Sidebar/> drawer", () => {
  it("opens from the toggle and closes via the close button", () => {
    const wrapper = mount(<Sidebar {...makeProps()} />)

    expect(wrapper.find("aside.sidebar").hasClass("is-open")).toBe(false)
    expect(wrapper.find(".sidebar-backdrop")).toHaveLength(0)

    wrapper.find(".sidebar-toggle").simulate("click")
    expect(wrapper.find("aside.sidebar").hasClass("is-open")).toBe(true)
    expect(wrapper.find(".sidebar-toggle").prop("aria-expanded")).toBe(true)

    wrapper.find(".sidebar__drawer-close").simulate("click")
    expect(wrapper.find("aside.sidebar").hasClass("is-open")).toBe(false)
  })

  it("closes when the backdrop is clicked", () => {
    const wrapper = mount(<Sidebar {...makeProps()} />)

    wrapper.find(".sidebar-toggle").simulate("click")
    wrapper.find(".sidebar-backdrop").simulate("click")

    expect(wrapper.find("aside.sidebar").hasClass("is-open")).toBe(false)
  })

  it("closes on Escape", () => {
    const wrapper = mount(<Sidebar {...makeProps()} />)

    wrapper.find(".sidebar-toggle").simulate("click")
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })
    wrapper.update()

    expect(wrapper.find("aside.sidebar").hasClass("is-open")).toBe(false)
  })

  it("closes after navigating", () => {
    const props = makeProps()
    const wrapper = mount(<Sidebar {...props} />)

    wrapper.find(".sidebar-toggle").simulate("click")
    wrapper.find(".sidebar__operation").at(0).simulate("click")

    expect(wrapper.find("aside.sidebar").hasClass("is-open")).toBe(false)
    expect(props.layoutActions.scrollTo).toHaveBeenCalled()
  })
})

describe("navigateTo", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("scrolls directly to an element that is already rendered", () => {
    const key: ["operations-tag", string] = ["operations-tag", "store orders"]
    const el = document.createElement("h3")
    el.id = domIdFromKey(key)
    document.body.appendChild(el)
    const layoutActions = makeLayoutActions()

    navigateTo(layoutActions, key)

    expect(el.id).toEqual("operations-tag-store_orders")
    expect(layoutActions.scrollToElement).toHaveBeenCalledWith(el)
    expect(layoutActions.scrollTo).not.toHaveBeenCalled()
  })

  it("ignores matching elements outside of the given root", () => {
    const key: ["operations", string, string] = ["operations", "pet", "addPet"]
    const el = document.createElement("div")
    el.id = domIdFromKey(key)
    document.body.appendChild(el)
    const root = document.createElement("div")
    document.body.appendChild(root)
    const layoutActions = makeLayoutActions()

    navigateTo(layoutActions, key, root)

    expect(layoutActions.scrollToElement).not.toHaveBeenCalled()
    expect(layoutActions.scrollTo).toHaveBeenCalledWith(key)
  })
})

describe("navigateToSchema", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  const base = {
    specPathBase: ["components", "schemas"],
    isJSONSchema202012: false,
    isVirtualized: false,
  }

  it("scrolls to a rendered Swagger 2 / OAS 3.0 model by id", () => {
    document.body.innerHTML = `<section class="models"><div id="model-Pet"></div></section>`
    const layoutActions = makeLayoutActions()

    navigateToSchema(layoutActions, { ...base, name: "Pet", index: 0 })

    expect(layoutActions.scrollToElement).toHaveBeenCalledWith(
      document.getElementById("model-Pet")
    )
  })

  it("scrolls to a rendered OAS 3.1 schema by position", () => {
    document.body.innerHTML = `<section class="models">
      <article class="json-schema-2020-12" data-json-schema-level="0"></article>
      <article class="json-schema-2020-12" data-json-schema-level="0">
        <article class="json-schema-2020-12" data-json-schema-level="1"></article>
      </article>
    </section>`
    const layoutActions = makeLayoutActions()

    navigateToSchema(layoutActions, {
      ...base,
      isJSONSchema202012: true,
      name: "Order",
      index: 1,
    })

    expect(layoutActions.scrollToElement).toHaveBeenCalledWith(
      document.querySelectorAll("section.models > article")[1]
    )
  })

  it("scrolls to the section itself when no schema is given", () => {
    document.body.innerHTML = `<section class="models"></section>`
    const layoutActions = makeLayoutActions()

    navigateToSchema(layoutActions, base)

    expect(layoutActions.scrollToElement).toHaveBeenCalledWith(
      document.querySelector("section.models")
    )
  })

  it("hands virtualized lists over to the models component", () => {
    const layoutActions = makeLayoutActions()

    navigateToSchema(layoutActions, {
      ...base,
      isVirtualized: true,
      name: "Pet",
      index: 0,
    })

    expect(layoutActions.scrollToVirtualizedSchema).toHaveBeenCalledWith("Pet")
    expect(layoutActions.scrollToElement).not.toHaveBeenCalled()
  })
})
