export interface KairaResponseGroundingProvenance {
  source: "world_memory";
  grounded: boolean;
  protected: boolean;
  reason?: string;
}
