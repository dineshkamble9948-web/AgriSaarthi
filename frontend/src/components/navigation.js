import {
  Calculator,
  CloudSun,
  FlaskConical,
  History,
  LayoutDashboard,
  Lightbulb,
  Map,
  ScanSearch,
  Sprout,
  TrendingUp
} from "lucide-react";

const navigation = [
  {
    title: "MAIN MENU",
    items: [
      { name: "Dashboard", icon: LayoutDashboard },
      { name: "Crop Recommendation", icon: Sprout },
      { name: "Disease Detection", icon: ScanSearch },
      { name: "Weather Intelligence", icon: CloudSun },
      { name: "Fertilizer & Soil", icon: FlaskConical }
    ]
  },
  {
    title: "FARM MANAGEMENT",
    items: [
      { name: "Farm History", icon: History },
      { name: "Farm Digital Twin", icon: Map },
      { name: "What-If Simulation", icon: Calculator },
      { name: "Next Best Action", icon: Lightbulb },
      { name: "Market Intelligence", icon: TrendingUp }
    ]
  }
];

export default navigation;
