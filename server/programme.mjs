const isObject = (value) => Boolean(value) && typeof value === "object";

/**
 * Serveren lagrer programmer som de er, men kontrollerer at formen er den
 * appen forventer, så ødelagte data ikke kan overskrive en god lagring.
 */
export function isProgramme(value) {
  return (
    isObject(value) &&
    value.schemaVersion === 1 &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.title === "string" &&
    typeof value.instructions === "string" &&
    typeof value.updatedAt === "string" &&
    Number.isFinite(Date.parse(value.updatedAt)) &&
    Number.isInteger(value.revision) &&
    value.revision >= 0 &&
    Array.isArray(value.items) &&
    value.items.every(
      (item) =>
        isObject(item) &&
        typeof item.id === "string" &&
        typeof item.notes === "string" &&
        isObject(item.exercise) &&
        typeof item.exercise.id === "string" &&
        typeof item.exercise.name === "string" &&
        typeof item.exercise.video === "string" &&
        typeof item.exercise.poster === "string" &&
        Array.isArray(item.parameters) &&
        item.parameters.every(
          (parameter) =>
            isObject(parameter) &&
            typeof parameter.id === "string" &&
            typeof parameter.key === "string" &&
            typeof parameter.value === "string",
        ),
    )
  );
}
