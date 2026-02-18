"use client";

import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDndPlanner } from "@/hooks/useDndPlanner";
import VehicleColumn from "@/components/planner/VehicleColumn";
import { Badge } from "@/components/ui/badge";

export default function RouteBoard({ editable = true }: { editable?: boolean }) {
  const { routes, onDragEnd } = useDndPlanner(editable);
  const stopCount = routes.reduce((sum, route) => sum + (route.stops?.length || 0), 0);

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <section className="card">
        <div className="card-header">
          <div>
            <div className="panel-title">Trip Board</div>
            <div className="text-lg font-semibold">Assigned Deliveries</div>
            <div className="card-subtitle">
              {editable ? "Drag to reorder stops and adjust the delivery sequence." : "View-only plan summary."}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-steel-300 bg-white text-steel-700">{routes.length} routes</Badge>
            <Badge className="border-steel-300 bg-white text-steel-700">{stopCount} stops</Badge>
          </div>
        </div>
        {routes.length === 0 ? (
          <div className="empty-state">Create a plan to generate delivery trips.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {routes.map((route) => (
              <SortableContext
                key={route.vehicle_id}
                items={route.stops.map((_, idx) => `${route.vehicle_id}:${idx}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="min-w-0">
                  <VehicleColumn route={route} editable={editable} />
                </div>
              </SortableContext>
            ))}
          </div>
        )}
      </section>
    </DndContext>
  );
}
