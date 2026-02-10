CREATE TABLE lot_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES lot_tracking(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  from_location_id UUID REFERENCES warehouse_locations(id),
  to_location_id UUID REFERENCES warehouse_locations(id),
  notes TEXT,
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lot_movements_lot_id ON lot_movements(lot_id);
CREATE INDEX idx_lot_movements_performed_at ON lot_movements(performed_at DESC);
CREATE INDEX idx_lot_movements_movement_type ON lot_movements(movement_type);

COMMENT ON TABLE lot_movements IS 'Tracks all movements and transactions for lots including consumption, transfers, and adjustments';
COMMENT ON COLUMN lot_movements.movement_type IS 'Type of movement: goods_received, consumption, transfer, adjustment, quarantine, release';
