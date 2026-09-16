import { useState } from "react";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  ChevronDown,
  ClipboardList,
  Undo2,
  X,
} from "lucide-react";
import {
  duplicateItem,
  moveItem,
  newParameter,
  parameterLabels,
  validateParameter,
  type Programme,
  type ParameterKey,
  type Prescription,
} from "../../domain/programme";
import type { Dispatch, SetStateAction } from "react";
export function ProgrammeBuilder({
  programme,
  setProgramme,
}: {
  programme: Programme;
  setProgramme: Dispatch<SetStateAction<Programme>>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{
    item: Prescription;
    index: number;
    programmeId: string;
  } | null>(null);
  function editItem(id: string, change: Partial<Prescription>) {
    setProgramme((p) => ({
      ...p,
      items: p.items.map((i) => (i.id === id ? { ...i, ...change } : i)),
    }));
  }
  return (
    <>
      <div className="programme-meta">
        <label htmlFor="programme-title">PROGRAMME NAME</label>
        <input
          id="programme-title"
          className="programme-title"
          value={programme.title}
          onChange={(e) =>
            setProgramme((p) => ({ ...p, title: e.target.value }))
          }
          maxLength={160}
        />
        <p className="privacy-note">
          Keep it general — don’t enter patient details.
        </p>
      </div>
      <div className="programme-items">
        {!programme.items.length ? (
          <div className="empty-programme">
            <div className="empty-illustration">
              <ClipboardList size={32} />
              <span>
                <Plus size={15} />
              </span>
            </div>
            <h3>
              Every programme
              <br />
              starts with one movement.
            </h3>
            <p>
              Choose an exercise from the library
              <br />
              and hit <strong>+ Add</strong> to get started.
            </p>
            <div className="empty-step">
              <span>01</span> Choose your exercises
            </div>
            <div className="empty-step">
              <span>02</span> Make the dosage your own
            </div>
            <div className="empty-step">
              <span>03</span> Save, print, and put it into practice
            </div>
          </div>
        ) : (
          programme.items.map((item, index) => (
            <article
              className="prescription-card"
              key={item.id}
              aria-label={`Exercise ${index + 1}: ${item.exercise.name}`}
            >
              <div className="prescription-top">
                <span className="exercise-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <button
                  className="exercise-details-toggle"
                  aria-label={`Vis beskrivelse for ${item.exercise.name}`}
                  aria-expanded={expanded === item.id}
                  aria-controls={`details-${item.id}`}
                  onClick={() =>
                    setExpanded(expanded === item.id ? null : item.id)
                  }
                >
                  <img src={item.exercise.poster} alt="" />
                  <div className="prescription-name">
                    <h3>{item.exercise.name}</h3>
                    <span>{item.exercise.equipment}</span>
                  </div>
                  <ChevronDown size={16} />
                </button>
                <button
                  className="icon-button small"
                  aria-label={`Remove exercise ${index + 1}`}
                  onClick={() => {
                    setRemoved({
                      item: structuredClone(item),
                      index,
                      programmeId: programme.id,
                    });
                    setProgramme((p) => ({
                      ...p,
                      items: p.items.filter((i) => i.id !== item.id),
                    }));
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              {expanded === item.id && (
                <div className="exercise-details" id={`details-${item.id}`}>
                  <video
                    src={item.exercise.video}
                    poster={item.exercise.poster}
                    controls
                    playsInline
                    preload="metadata"
                  />
                  {item.exercise.reviewNote && (
                    <p className="review-note">
                      Videomerknad: {item.exercise.reviewNote}
                    </p>
                  )}
                  <label htmlFor={`description-${item.id}`}>
                    Kort beskrivelse
                  </label>
                  <textarea
                    id={`description-${item.id}`}
                    rows={3}
                    maxLength={2000}
                    value={item.exercise.description}
                    onChange={(e) =>
                      editItem(item.id, {
                        exercise: {
                          ...item.exercise,
                          description: e.target.value,
                        },
                      })
                    }
                  />
                  <small>Endringer lagres i dette programmet.</small>
                </div>
              )}
              <div className="parameter-grid">
                {item.parameters.map((param) => {
                  const error = validateParameter(param);
                  const label = parameterLabels[param.key];
                  const update = (change: Partial<typeof param>) =>
                    editItem(item.id, {
                      parameters: item.parameters.map((v) =>
                        v.id === param.id ? { ...v, ...change } : v,
                      ),
                    });
                  return (
                    <div
                      className={`parameter ${param.key === "custom" ? "custom" : ""}`}
                      key={param.id}
                    >
                      <div className="parameter-label">
                        {param.key === "custom" ? (
                          <input
                            aria-label={`Custom parameter name for exercise ${index + 1}`}
                            placeholder="Parameter name"
                            value={param.label || ""}
                            maxLength={60}
                            onChange={(e) => update({ label: e.target.value })}
                          />
                        ) : (
                          <label htmlFor={param.id}>{label}</label>
                        )}
                        <button
                          aria-label={`Remove ${label} from exercise ${index + 1}`}
                          onClick={() =>
                            editItem(item.id, {
                              parameters: item.parameters.filter(
                                (v) => v.id !== param.id,
                              ),
                            })
                          }
                        >
                          <X size={10} />
                        </button>
                      </div>
                      <div
                        className={`parameter-input ${error ? "invalid" : ""}`}
                      >
                        {param.key === "side" ? (
                          <select
                            id={param.id}
                            value={param.value}
                            onChange={(e) => update({ value: e.target.value })}
                          >
                            <option value="">—</option>
                            <option>Left</option>
                            <option>Right</option>
                            <option>Both</option>
                          </select>
                        ) : (
                          <input
                            id={param.id}
                            aria-invalid={!!error}
                            aria-label={
                              param.key === "custom"
                                ? `${param.label?.trim() || "Custom parameter"} value for exercise ${index + 1}`
                                : undefined
                            }
                            aria-describedby={
                              error ? `${param.id}-error` : undefined
                            }
                            value={param.value}
                            placeholder="—"
                            inputMode={
                              [
                                "frequency",
                                "side",
                                "tempo",
                                "custom",
                                "reps",
                              ].includes(param.key)
                                ? "text"
                                : "decimal"
                            }
                            onChange={(e) => update({ value: e.target.value })}
                            maxLength={120}
                          />
                        )}
                        {param.key === "duration" ? (
                          <select
                            aria-label={`Duration unit for exercise ${index + 1}`}
                            value={param.unit || "sec"}
                            onChange={(e) => update({ unit: e.target.value })}
                          >
                            <option value="sec">sec</option>
                            <option value="min">min</option>
                          </select>
                        ) : (
                          <span>
                            {param.key === "load"
                              ? "kg"
                              : ["hold", "rest"].includes(param.key)
                                ? "sec"
                                : ""}
                          </span>
                        )}
                      </div>
                      {error && (
                        <small id={`${param.id}-error`} className="field-error">
                          {error}
                        </small>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="prescription-options">
                <div className="add-parameter">
                  <Plus size={12} />
                  <select
                    aria-label={`Add parameter to exercise ${index + 1}`}
                    value=""
                    onChange={(e) => {
                      if (e.target.value)
                        editItem(item.id, {
                          parameters: [
                            ...item.parameters,
                            newParameter(e.target.value as ParameterKey),
                          ],
                        });
                    }}
                  >
                    <option value="">Add parameter</option>
                    {(Object.keys(parameterLabels) as ParameterKey[])
                      .filter(
                        (k) =>
                          k === "custom" ||
                          !item.parameters.some((p) => p.key === k),
                      )
                      .map((k) => (
                        <option value={k} key={k}>
                          {parameterLabels[k]}
                        </option>
                      ))}
                  </select>
                  <ChevronDown size={12} />
                </div>
                <div className="reorder-actions">
                  <button
                    className="icon-button small"
                    disabled={index === 0}
                    aria-label={`Move exercise ${index + 1} up`}
                    onClick={() =>
                      setProgramme((p) => moveItem(p, item.id, -1))
                    }
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    className="icon-button small"
                    disabled={index === programme.items.length - 1}
                    aria-label={`Move exercise ${index + 1} down`}
                    onClick={() => setProgramme((p) => moveItem(p, item.id, 1))}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    className="icon-button small"
                    aria-label={`Duplicate exercise ${index + 1}`}
                    onClick={() =>
                      setProgramme((p) => duplicateItem(p, item.id))
                    }
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
              <textarea
                className="exercise-notes"
                aria-label={`Notes for exercise ${index + 1}`}
                placeholder="Add a cue or instruction…"
                rows={1}
                value={item.notes}
                maxLength={2000}
                onChange={(e) => editItem(item.id, { notes: e.target.value })}
              />
            </article>
          ))
        )}
        {removed && removed.programmeId === programme.id && (
          <div className="undo-notice">
            <span>Exercise removed</span>
            <button
              onClick={() => {
                setProgramme((p) => {
                  const items = [...p.items];
                  items.splice(
                    Math.min(removed.index, items.length),
                    0,
                    removed.item,
                  );
                  return { ...p, items };
                });
                setRemoved(null);
              }}
            >
              <Undo2 size={14} /> Undo
            </button>
          </div>
        )}
        {!!programme.items.length && (
          <div className="general-notes">
            <label htmlFor="general-instructions">Programme instructions</label>
            <textarea
              id="general-instructions"
              placeholder="Frequency, things to remember, words of encouragement…"
              value={programme.instructions}
              rows={3}
              maxLength={5000}
              onChange={(e) =>
                setProgramme((p) => ({ ...p, instructions: e.target.value }))
              }
            />
          </div>
        )}
      </div>
    </>
  );
}
