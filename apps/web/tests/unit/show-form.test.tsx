import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { act } from "react";
import ShowForm from "@/components/admin/ShowForm";

describe("ShowForm", () => {
  it("submits valid values", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    render(<ShowForm onSubmit={handleSubmit} />);

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: "Test Show" } });
      fireEvent.change(screen.getByLabelText(/Slug/i), { target: { value: "test-show" } });
      fireEvent.change(screen.getByLabelText(/Description/i), {
        target: { value: "Test description" }
      });

      fireEvent.click(screen.getByRole("button", { name: /Save Show/i }));
    });

    await waitFor(() => expect(handleSubmit).toHaveBeenCalled());
  });
});
