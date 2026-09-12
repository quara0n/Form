import { useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Play,
  Plus,
  Check,
  X,
  ArrowUpRight,
  RotateCcw,
} from "lucide-react";
import { type Exercise, searchExercises } from "../../domain/programme";
import { Modal } from "../../components/Modal";
export function ExerciseLibrary({
  exercises,
  onAdd,
  counts,
}: {
  exercises: Exercise[];
  onAdd: (e: Exercise) => void;
  counts: Record<string, number>;
}) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [equipment, setEquipment] = useState("");
  const [preview, setPreview] = useState<Exercise | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const results = useMemo(
    () => searchExercises(exercises, query, region, equipment),
    [exercises, query, region, equipment],
  );
  function open(e: Exercise) {
    setPreview(e);
    setFailed(false);
    setRetry(0);
  }
  return (
    <section className="library" aria-label="Exercise library">
      <div className="section-eyebrow">YOUR CLINICAL TOOLKIT</div>
      <div className="library-title">
        <div>
          <h1>
            A little movement.
            <br />
            <span>A lot of possibility.</span>
          </h1>
          <p>Find the right exercises. Build a programme that fits.</p>
        </div>
        <span className="edition">
          THE STARTER
          <br />
          COLLECTION <span>↗</span>
        </span>
      </div>
      <div className="search-row">
        <div className="search-field">
          <Search size={20} />
          <input
            aria-label="Search exercises"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises, muscles or movements…"
          />
          {query && (
            <button
              className="icon-button small"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="equipment-filter">
          <SlidersHorizontal size={17} />
          <select
            aria-label="Filter by equipment"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
          >
            <option value="">All equipment</option>
            {[...new Set(exercises.map((e) => e.equipment))].sort().map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="filter-tabs" aria-label="Body region">
        {["", "Lower body", "Upper body", "Trunk"].map((v) => (
          <button
            key={v}
            className={region === v ? "selected" : ""}
            aria-pressed={region === v}
            onClick={() => setRegion(v)}
          >
            {v || "All exercises"}
          </button>
        ))}
      </div>
      <div className="results-heading">
        <h2>
          {region || "Exercise library"} <span>{results.length}</span>
        </h2>
        <span>Curated movements · Openly licensed</span>
      </div>
      {!results.length ? (
        <div className="empty-search">
          <Search size={30} />
          <h3>No exercises found</h3>
          <p>Try another movement or clear your filters.</p>
          <button
            className="secondary-button"
            onClick={() => {
              setQuery("");
              setRegion("");
              setEquipment("");
            }}
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="exercise-grid">
          {results.map((e, index) => (
            <article className="exercise-card" key={e.id}>
              <button
                className="exercise-image"
                aria-label={`Preview ${e.name}`}
                onClick={() => open(e)}
              >
                <img
                  src={e.poster}
                  alt={`${e.name} demonstration`}
                  loading={index > 5 ? "lazy" : "eager"}
                />
                <span className="video-label">
                  <Play size={10} fill="currentColor" /> VIDEO
                </span>
                <span className="play-circle">
                  <Play size={20} fill="currentColor" />
                </span>
                {counts[e.id] > 0 && (
                  <span className="added-label">
                    <Check size={12} /> In programme
                    {counts[e.id] > 1 ? ` · ${counts[e.id]}` : ""}
                  </span>
                )}
              </button>
              <div className="exercise-card-body">
                <span className="body-region">{e.region}</span>
                <h3>
                  <button onClick={() => open(e)}>{e.name}</button>
                </h3>
                <div className="card-bottom">
                  <span>{e.equipment}</span>
                  <button
                    className="add-exercise"
                    aria-label={`Add ${e.name}`}
                    onClick={() => onAdd(e)}
                  >
                    <Plus size={17} />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="library-foot">
        <span className="tiny-leaf">✳</span>
        <p>
          A considered starting point.
          <br />
          <span>12 movements to explore, adapt and make your own.</span>
        </p>
      </div>
      {preview && (
        <Modal title={preview.name} onClose={() => setPreview(null)} wide>
          <div className="preview-video">
            {failed ? (
              <div className="video-error">
                <Play size={28} />
                <h3>This video couldn’t load</h3>
                <p>
                  Your programme is unchanged. You can still use the
                  instructions below.
                </p>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setFailed(false);
                    setRetry((n) => n + 1);
                  }}
                >
                  <RotateCcw size={16} /> Retry video
                </button>
              </div>
            ) : (
              <video
                key={`${preview.id}-${retry}`}
                src={preview.video}
                poster={preview.poster}
                controls
                autoPlay
                playsInline
                onError={() => setFailed(true)}
              />
            )}
          </div>
          <div className="preview-content">
            <div className="preview-tags">
              <span>{preview.region}</span>
              <span>{preview.equipment}</span>
            </div>
            <h3>Movement notes</h3>
            <p>{preview.description}</p>
            <div className="media-credit">
              Video: {preview.credit} · {preview.license}
              {preview.license === "CC BY 3.0" && (
                <>
                  {" "}
                  ·{" "}
                  <a
                    href="https://creativecommons.org/licenses/by/3.0/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Licence
                  </a>
                </>
              )}
              <br />
              <a href={preview.source} target="_blank" rel="noreferrer">
                Original video & attribution <ArrowUpRight size={12} />
              </a>{" "}
              · Poster extracted from video.
            </div>
            <button
              className="primary-button full-width"
              onClick={() => onAdd(preview)}
            >
              <Plus size={18} /> Add to programme
              {counts[preview.id] ? ` (${counts[preview.id]} added)` : ""}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
