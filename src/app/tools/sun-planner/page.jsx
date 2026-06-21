import SunPlannerTool from "@/components/sun-planner/SunPlannerTool";

export const metadata = {
  title: "Sun Planner — Brickbook",
};

export default function SunPlannerPage() {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <SunPlannerTool />
    </div>
  );
}
