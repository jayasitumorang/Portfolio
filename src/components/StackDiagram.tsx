import { layers } from "@/data/profile";

// A request travelling through the four layers of a full-stack system.
export function StackDiagram({ years }: { years: number }) {
  return (
    <figure className="stack" data-tilt="10" aria-label="Diagram of the layers I work across: interface, services, data and cloud">
      <div className="stack-req">
        <span>
          <b>GET</b> /jaya-situmorang
        </span>
        <span>request</span>
      </div>
      <div className="stack-body">
        <span className="wire" aria-hidden />
        <span className="packet" aria-hidden />
        <span className="packet back" aria-hidden />
        {layers.map((l, i) => (
          <div className="layer" key={l.id} style={{ "--i": i } as React.CSSProperties}>
            <div className="layer-name">
              <b>{l.label}</b>
              <span>{l.note}</span>
            </div>
            <div className="chips">
              {l.items.slice(0, 5).map((t) => (
                <span className="chip" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="stack-res">
        <span>
          <b>200 OK</b> · {years}+ years shipping
        </span>
        <span>response</span>
      </div>
    </figure>
  );
}
