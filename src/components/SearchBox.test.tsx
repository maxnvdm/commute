import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchBox from "./SearchBox";

const RESULTS = [
  { label: "Cape Town City Centre", lat: -33.92, lng: 18.42 },
  { label: "Cape Town Station", lat: -33.92, lng: 18.43 },
];

function mockGeocode() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ results: RESULTS }), { status: 200 }),
    ),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SearchBox", () => {
  it("exposes combobox ARIA wiring", () => {
    render(<SearchBox city="cape-town" onSelect={() => {}} />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
  });

  it("navigates results with the keyboard and selects with Enter", async () => {
    mockGeocode();
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<SearchBox city="cape-town" onSelect={onSelect} />);

    const input = screen.getByRole("combobox");
    await user.type(input, "cape");

    // Options appear after the debounced fetch resolves.
    await waitFor(() =>
      expect(screen.getAllByRole("option")).toHaveLength(2),
    );
    expect(input).toHaveAttribute("aria-expanded", "true");

    // ArrowDown highlights the first option, ArrowDown again the second.
    await user.keyboard("{ArrowDown}{ArrowDown}");
    const options = screen.getAllByRole("option");
    expect(options[1]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(RESULTS[1]);
  });

  it("closes the list on Escape", async () => {
    mockGeocode();
    const user = userEvent.setup();
    render(<SearchBox city="cape-town" onSelect={() => {}} />);

    const input = screen.getByRole("combobox");
    await user.type(input, "cape");
    await waitFor(() =>
      expect(screen.getAllByRole("option")).toHaveLength(2),
    );

    await user.keyboard("{Escape}");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });
});
