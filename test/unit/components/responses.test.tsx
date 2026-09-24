/**
 * @prettier
 */
import React from "react"
import { mount } from "enzyme"
import { fromJS, List } from "immutable"
import Responses from "core/components/responses"

const Dummy = () => null
const LiveResponse = () => <div className="live-response-mock" />
const Response = ({ code }: { code: string }) => (
  <tr className="response-mock">
    <td>{code}</td>
  </tr>
)

const components: Record<string, React.ComponentType<never>> = {
  liveResponse: LiveResponse,
  response: Response,
}

const makeProps = ({
  collapseResponses = false,
  shown = {},
  tryItOutResponse = null,
}: {
  collapseResponses?: boolean
  shown?: Record<string, boolean>
  tryItOutResponse?: unknown
} = {}) => ({
  responses: fromJS({ "200": {}, "404": {}, "x-ext": {} }),
  tryItOutResponse,
  path: "/pet",
  method: "get",
  displayRequestDuration: false,
  getComponent: (name: string) => components[name] || Dummy,
  getConfigs: () => ({ collapseResponses }),
  specSelectors: { isOAS3: () => true },
  specActions: {},
  oas3Actions: {},
  oas3Selectors: { activeExamplesMember: () => null },
  specPath: List(),
  fn: {},
  layoutSelectors: {
    isShown: (key: string[], def: boolean) => shown[key.join("|")] ?? def,
  },
  layoutActions: { show: jest.fn() },
})

describe("<Responses/>", () => {
  it("shows documented responses by default", () => {
    const wrapper = mount(<Responses {...makeProps()} />)

    expect(wrapper.find(".responses-toggle").prop("aria-expanded")).toBe(true)
    expect(wrapper.find(".response-mock")).toHaveLength(2)
    expect(wrapper.find(".responses-codes")).toHaveLength(0)
  })

  it("collapses documented responses when collapseResponses is set", () => {
    const wrapper = mount(
      <Responses {...makeProps({ collapseResponses: true })} />
    )

    expect(wrapper.find(".responses-toggle").prop("aria-expanded")).toBe(false)
    expect(wrapper.find(".responses-table")).toHaveLength(0)
    expect(wrapper.find(".responses-inner")).toHaveLength(0)
    expect(
      wrapper.find(".responses-codes .response-code").map((n) => n.text())
    ).toEqual(["200", "404"])
  })

  it("toggles the per-operation expansion state", () => {
    const props = makeProps({ collapseResponses: true })
    const wrapper = mount(<Responses {...props} />)

    wrapper.find(".responses-toggle").simulate("click")

    expect(props.layoutActions.show).toHaveBeenCalledWith(
      ["operation-responses", "/pet", "get"],
      true
    )
  })

  it("respects a stored expansion state over the default", () => {
    const wrapper = mount(
      <Responses
        {...makeProps({
          collapseResponses: true,
          shown: { "operation-responses|/pet|get": true },
        })}
      />
    )

    expect(wrapper.find(".response-mock")).toHaveLength(2)
  })

  it("keeps the live server response visible while collapsed", () => {
    const wrapper = mount(
      <Responses
        {...makeProps({
          collapseResponses: true,
          tryItOutResponse: fromJS({ status: 404 }),
        })}
      />
    )

    expect(wrapper.find(".live-response-mock")).toHaveLength(1)
    expect(wrapper.find(".responses-table")).toHaveLength(0)
    expect(wrapper.find(".responses-codes .response_current").text()).toEqual(
      "404"
    )
  })
})
