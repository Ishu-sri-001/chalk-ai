import {
  AtomIcon,
  BrainCircuitIcon,
  ChartColumnIcon,
  CodeXmlIcon,
  DropletsIcon,
  LandmarkIcon,
  LeafIcon,
  NetworkIcon,
  RepeatIcon,
  SyringeIcon,
  TrendingUpIcon,
  TriangleRightIcon,
} from "lucide-react";

export const SUGGESTIONS = [
  { topic: "How neural networks work", icon: BrainCircuitIcon },
  { topic: "JavaScript closures", icon: CodeXmlIcon },
  { topic: "Photosynthesis", icon: LeafIcon },
  { topic: "How black holes work", icon: AtomIcon },
  { topic: "Binary search trees", icon: NetworkIcon },
  { topic: "Supply and demand", icon: ChartColumnIcon },
  { topic: "The water cycle", icon: DropletsIcon },
  { topic: "Recursion", icon: RepeatIcon },
  { topic: "How vaccines work", icon: SyringeIcon },
  { topic: "Compound interest", icon: TrendingUpIcon },
  { topic: "The Pythagorean theorem", icon: TriangleRightIcon },
  { topic: "The French Revolution", icon: LandmarkIcon },
];

export const SUGGESTIONS_PER_PAGE = 6;
