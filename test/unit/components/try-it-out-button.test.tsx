/**
 * @prettier
 */
import React from "react"
import { shallow } from "enzyme"
import TryItOutButton from "core/components/try-it-out-button"

describe("<TryItOutButton/>", () => {
  it("toggles between Try it out and Cancel", () => {
    expect(
      shallow(<TryItOutButton />)
        .find("button")
        .text()
    ).toContain("Try it out")
    expect(
      shallow(<TryItOutButton enabled />)
        .find("button")
        .text()
    ).toEqual("Cancel")
  })

  it("renders nothing when always enabled", () => {
    const wrapper = shallow(<TryItOutButton enabled alwaysEnabled />)

    expect(wrapper.isEmptyRender()).toBe(true)
  })

  it("keeps only the Reset button when always enabled", () => {
    const wrapper = shallow(
      <TryItOutButton enabled alwaysEnabled isOAS3 hasUserEditedBody />
    )

    expect(wrapper.find("button").map((n) => n.text())).toEqual(["Reset"])
  })
})
