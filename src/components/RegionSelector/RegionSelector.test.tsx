import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { regions } from "../../data/regions";
import { RegionSelector } from "./RegionSelector";

afterEach(cleanup);

function ControlledSelector({ initialValue }: { initialValue?: string }) {
  const [value, setValue] = useState<string | undefined>(initialValue);

  return (
    <>
      <RegionSelector label="Region A" regions={regions} value={value} onChange={setValue} />
      <output>{value ?? "none"}</output>
    </>
  );
}

function openSearch() {
  fireEvent.click(screen.getByRole("button", { name: "Show Region A regions" }));
  return screen.getByRole("combobox", { name: "Region A" });
}

it("displays the selected controlled region", () => {
  render(<ControlledSelector initialValue="FI20" />);

  expect(screen.getByRole("combobox", { name: "Region A" })).toHaveValue("Åland, Finland");
});

it("searches names, countries, NUTS IDs, and normalized diacritics", () => {
  render(<ControlledSelector />);
  const search = openSearch();

  fireEvent.change(search, { target: { value: "aland" } });
  expect(screen.getByRole("option", { name: /Åland, Finland/ })).toBeInTheDocument();

  fireEvent.change(search, { target: { value: "sweden" } });
  expect(screen.getByRole("option", { name: /Stockholm, Sweden/ })).toBeInTheDocument();

  fireEvent.change(search, { target: { value: "FI1B" } });
  expect(screen.getByRole("option", { name: /Helsinki-Uusimaa, Finland/ })).toBeInTheDocument();
});

it("emits canonical NUTS IDs for pointer and keyboard selection", () => {
  const onChange = vi.fn();
  const { rerender } = render(<RegionSelector label="Region A" regions={regions} value={undefined} onChange={onChange} />);
  let search = openSearch();

  fireEvent.change(search, { target: { value: "Stockholm" } });
  fireEvent.click(screen.getByRole("option", { name: /Stockholm, Sweden/ }));
  expect(onChange).toHaveBeenCalledWith("SE11");

  rerender(<RegionSelector label="Region A" regions={regions} value={undefined} onChange={onChange} />);
  search = openSearch();
  fireEvent.keyDown(search, { key: "ArrowDown" });
  fireEvent.keyDown(search, { key: "Enter" });
  expect(onChange).toHaveBeenCalledWith("DK01");
});

it("clears selected values and closes the listbox with Escape", () => {
  const onChange = vi.fn();
  render(<RegionSelector label="Region A" regions={regions} value="FI20" onChange={onChange} />);

  fireEvent.click(screen.getByRole("button", { name: "Clear Region A selection" }));
  expect(onChange).toHaveBeenCalledWith(undefined);

  const search = openSearch();
  fireEvent.keyDown(search, { key: "Escape" });
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});

it("does not open or emit changes while disabled", () => {
  const onChange = vi.fn();
  render(<RegionSelector label="Region A" regions={regions} value={undefined} onChange={onChange} disabled />);

  expect(screen.getByRole("combobox", { name: "Region A" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Show Region A regions" })).toBeDisabled();
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
});

it("makes a region selected in the other slot unavailable", () => {
  const onChange = vi.fn();
  render(
    <RegionSelector
      label="Region B"
      regions={regions}
      value={undefined}
      onChange={onChange}
      unavailableRegionIds={["FI1B"]}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Show Region B regions" }));
  const unavailableOption = screen.getByRole("option", { name: /Helsinki-Uusimaa, Finland/ });

  expect(unavailableOption).toHaveAttribute("data-disabled");
  fireEvent.click(unavailableOption);
  expect(onChange).not.toHaveBeenCalled();
});
