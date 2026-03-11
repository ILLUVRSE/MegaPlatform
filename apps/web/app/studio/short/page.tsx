/**
 * Short creator page.
 * Request/response: renders viewer-facing creator flow.
 * Guard: none; public for MVP.
 */
import StudioCreatorFlow from "../components/StudioCreatorFlow";
import MyShorts from "../components/MyShorts";

export default function ShortStudioPage() {
  return (
    <div className="space-y-6">
      <StudioCreatorFlow />
      <MyShorts />
    </div>
  );
}
