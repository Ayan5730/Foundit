"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  LockKeyhole,
  MapPin,
  Pencil,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  emptyDraft,
  validateDraft,
  validatePhoto,
  toCreateReport,
  type Draft,
  type DraftErrors,
  type ReportKind,
} from "@/lib/client/report-draft";

import type { Intake, PublicReport } from "@/shared/api";
import {
  api,
  post,
  message,
  ApiClientError,
  requestIdentity,
} from "@/lib/client/api";
import { RequireSession, useSession } from "./session";
import { createSharedPreview } from "@/lib/client/shared-preview";

export function ReportForm({ kind }: { kind: ReportKind }) {
  return (
    <main id="main-content" className="site-width report-page">
      <RequireSession>
        <ReportFormContent kind={kind} />
      </RequireSession>
    </main>
  );
}
function ReportFormContent({ kind }: { kind: ReportKind }) {
  const [draft, setDraft] = useState<Draft>({ ...emptyDraft });
  const [errors, setErrors] = useState<DraftErrors>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [sharePreview, setSharePreview] = useState(false);
  const [preview, setPreview] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const previewRef = useRef("");
  const summaryRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const found = kind === "found";
  const session = useSession();
  const [busy, setBusy] = useState<"assist" | "submit" | null>(null);
  const [requestError, setRequestError] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [assistance, setAssistance] = useState<Intake | null>(null);
  const [featureText, setFeatureText] = useState("");
  const requestRef = useRef<{ payload: string; id: string } | null>(null);
  const categories = session.data!.choices.categories;
  const locations = session.data!.choices.locations;
  async function intake(requestAssistance = false): Promise<Intake> {
    const form = new FormData();
    form.set("kind", kind);
    form.set("description", draft.description);
    form.set("assist", String(requestAssistance));
    if (photo) {
      form.set("photo", photo);
      if (sharePreview) form.set("shared_preview", await createSharedPreview(photo));
    }
    const result = await api<Intake>("/intake", { method: "POST", body: form });
    setIntakeId(result.id);
    return result;
  }
  async function assist() {
    if (!draft.description.trim() && !photo) {
      setRequestError("Add a public description or select a photo first.");
      return;
    }
    setBusy("assist");
    setRequestError("");
    setNeedsSignIn(false);
    try {
      setAssistance(await intake(true));
    } catch (reason) {
      setRequestError(message(reason));
      setNeedsSignIn(reason instanceof ApiClientError && reason.status === 401);
    } finally {
      setBusy(null);
    }
  }
  function applySuggestions() {
    if (!assistance) return;
    const value = assistance.suggestions;
    setDraft((previous) => ({
      ...previous,
      title: value.title ?? previous.title,
      category: value.category ?? previous.category,
      color: value.color ?? previous.color,
      location: value.location ?? previous.location,
    }));
    if (value.visible_features.length)
      setFeatureText(value.visible_features.join(", "));
    setReviewing(false);
    setErrors({});
  }
  async function submitReport() {
    if (Object.keys(validateDraft(draft, kind)).length) {
      setReviewing(false);
      setErrors(validateDraft(draft, kind));
      return;
    }
    setBusy("submit");
    setRequestError("");
    try {
      const features = featureText
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      if (features.length > 10 || features.some((value) => value.length > 80))
        throw new Error(
          "Use up to 10 visible features, with no more than 80 characters each.",
        );
      const attachedId = photo && !intakeId ? (await intake()).id : intakeId;
      const payload = toCreateReport(
        draft,
        kind,
        "00000000-0000-4000-8000-000000000000",
        attachedId,
        features,
      );
      requestRef.current = requestIdentity(requestRef.current, {
        ...payload,
        client_request_id: undefined,
      });
      const report = await post<PublicReport>("/reports", {
        ...payload,
        client_request_id: requestRef.current.id,
      });
      window.location.assign("/reports/" + report.id);
    } catch (reason) {
      setRequestError(message(reason));
      setNeedsSignIn(reason instanceof ApiClientError && reason.status === 401);
      if (reason instanceof ApiClientError && reason.status === 422) {
        const names: Record<string, keyof Draft> = {
          title: "title",
          category: "category",
          color: "color",
          description: "description",
          location: "location",
          occurred_at: "occurredAt",
          private_clue: "privateClue",
        };
        const mapped: DraftErrors = {};
        for (const [key, values] of Object.entries(reason.fieldErrors)) {
          if (names[key]) mapped[names[key]] = values[0];
        }
        if (Object.keys(mapped).length) {
          setErrors(mapped);
          setReviewing(false);
          requestAnimationFrame(() => summaryRef.current?.focus());
        }
      }
      setBusy(null);
    }
  }

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );
  useEffect(() => {
    if (reviewing) reviewRef.current?.focus();
  }, [reviewing]);

  function update(field: keyof Draft, value: string) {
    setAssistance(null);
    setDraft((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setReviewing(false);
  }
  function clearPhoto() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setPreview("");
    setPhoto(null);
    setSharePreview(false);
    setPhotoError("");
    setReviewing(false);
    setIntakeId(null);
    setAssistance(null);
    if (fileRef.current) fileRef.current.value = "";
  }
  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    clearPhoto();
    const error = validatePhoto(file);
    if (error) {
      setPhotoError(error);
      return;
    }
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreview(url);
    setPhoto(file);
  }
  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateDraft(draft, kind);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setReviewing(false);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setReviewing(true);
  }
  function fieldProps(field: keyof Draft, hintId?: string) {
    const describedBy = [errors[field] ? field + "-error" : null, hintId]
      .filter(Boolean)
      .join(" ");
    return {
      id: field,
      name: field,
      value: draft[field],
      "aria-invalid": Boolean(errors[field]),
      "aria-describedby": describedBy || undefined,
    };
  }
  function errorText(field: keyof Draft) {
    return errors[field] ? (
      <span className="field-error" id={field + "-error"}>
        {errors[field]}
      </span>
    ) : null;
  }
  return (
    <div>
      <a href="/" className="back-link">
        <ArrowLeft size={15} /> Back to help desk
      </a>
      <div className="report-heading">
        <p className="section-kicker">
          {found
            ? "A good find deserves a way home"
            : "Let’s start with what you remember"}
        </p>
        <h1>{found ? "Found something?" : "What went missing?"}</h1>
        <p>
          {found
            ? "Describe what you found and bring the item to the event help desk so staff can return it."
            : "You don’t need every detail. Start with the item, the place, and an approximate time."}
        </p>
      </div>
      <div className="report-layout">
        <div>
          <nav className="kind-switch" aria-label="Report type">
            <a href="/report/lost" aria-current={!found ? "page" : undefined}>
              I lost something
            </a>
            <a href="/report/found" aria-current={found ? "page" : undefined}>
              I found something
            </a>
          </nav>
          <div className="assistance-toolbar">
            <button
              type="button"
              className="button button-secondary"
              onClick={assist}
              disabled={busy !== null}
            >
              {busy === "assist"
                ? "Looking at the public clues…"
                : "Help describe this item"}
            </button>
            <p>
              Photo and description suggestions are editable. Private ownership
              clues are excluded.
            </p>
          </div>
          {assistance ? (
            <section className="assistance-result" aria-label="AI suggestions">
              <h2>
                {Object.values(assistance.providers).includes("available")
                  ? "Suggestions to review"
                  : "AI assistance is unavailable right now"}
              </h2>
              <p>
                {Object.values(assistance.providers).includes("available")
                  ? "Apply these public attributes, then check and edit them before submitting."
                  : "Continue manually. Your report does not depend on AI being available."}
              </p>
              <dl>
                <div>
                  <dt>Item name</dt>
                  <dd>{assistance.suggestions.title ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{assistance.suggestions.category ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt>Color</dt>
                  <dd>{assistance.suggestions.color ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt>Visible features</dt>
                  <dd>
                    {assistance.suggestions.visible_features.join(", ") ||
                      "Unknown"}
                  </dd>
                </div>
              </dl>
              {assistance.suggestions.follow_up ? (
                <p className="submission-notice">
                  {assistance.suggestions.follow_up}
                </p>
              ) : null}
              {Object.values(assistance.providers).includes("available") ? (
                <button
                  className="text-action"
                  onClick={applySuggestions}
                  disabled={busy !== null}
                >
                  Apply suggestions to form
                </button>
              ) : null}
            </section>
          ) : null}
          {requestError && !reviewing ? (
            <div className="error-summary" role="alert">
              <p>{requestError}</p>
              {needsSignIn ? (
                <a href={session.signInHref} target="_top">
                  Sign in again (leaves this draft)
                </a>
              ) : null}
            </div>
          ) : null}
          <form
            className="report-form"
            onSubmit={review}
            autoComplete="off"
            noValidate
          >
            {Object.values(errors).some(Boolean) ? (
              <div
                className="error-summary"
                ref={summaryRef}
                tabIndex={-1}
                role="alert"
              >
                <strong>Check the highlighted fields.</strong>
                <p>
                  Your details are still here. Complete the missing information
                  to review your report.
                </p>
              </div>
            ) : null}
            <fieldset disabled={busy !== null}>
              <legend>
                <span>1</span> Tell us about the item
              </legend>
              <p className="fieldset-description">
                Describe what someone could see. Keep identifying secrets for
                the private check.
              </p>
              <div className="field">
                <label htmlFor="title">
                  Item name <span aria-hidden="true">*</span>
                </label>
                <input
                  {...fieldProps("title")}
                  maxLength={120}
                  placeholder="e.g. Navy laptop backpack"
                  onChange={(e) => update("title", e.target.value)}
                  required
                />
                {errorText("title")}
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="category">
                    Category <span aria-hidden="true">*</span>
                  </label>
                  <select
                    {...fieldProps("category")}
                    onChange={(e) => update("category", e.target.value)}
                    required
                  >
                    <option value="">Choose a category</option>
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                  {errorText("category")}
                </div>
                <div className="field">
                  <label htmlFor="color">
                    Main color <small>Optional</small>
                  </label>
                  <input
                    {...fieldProps("color")}
                    maxLength={80}
                    placeholder="e.g. Navy blue"
                    onChange={(e) => update("color", e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="description">
                  Visible details <span aria-hidden="true">*</span>
                </label>
                <textarea
                  {...fieldProps("description", "description-hint")}
                  maxLength={2000}
                  rows={4}
                  placeholder="Shape, material, or other visible details. Leave out serial numbers and hidden identifying clues."
                  onChange={(e) => update("description", e.target.value)}
                  required
                />
                {errorText("description")}
                <span className="field-hint" id="description-hint">
                  Keep private clues out of this description.
                </span>
              </div>
              <div className="field">
                <label htmlFor="features">
                  Visible features <small>Optional</small>
                </label>
                <input
                  id="features"
                  value={featureText}
                  maxLength={810}
                  onChange={(event) => {
                    setFeatureText(event.target.value);
                    setAssistance(null);
                    setReviewing(false);
                  }}
                  placeholder="e.g. Silver zipper, canvas material"
                />
                <span className="field-hint">
                  Up to 10 features, separated by commas. Check any AI
                  suggestions.
                </span>
              </div>
            </fieldset>
            <fieldset disabled={busy !== null}>
              <legend>
                <span>2</span> Where and when?
              </legend>
              <p className="fieldset-description">
                An estimate is fine. Choose the closest event area.
              </p>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="location">
                    Event location <span aria-hidden="true">*</span>
                  </label>
                  <select
                    {...fieldProps("location")}
                    onChange={(e) => update("location", e.target.value)}
                    required
                  >
                    <option value="">Choose a location</option>
                    {locations.map((location) => (
                      <option key={location}>{location}</option>
                    ))}
                  </select>
                  {errorText("location")}
                </div>
                <div className="field">
                  <label htmlFor="occurredAt">
                    {found ? "When you found it" : "Last seen"}{" "}
                    <span aria-hidden="true">*</span>
                  </label>
                  <input
                    {...fieldProps("occurredAt", "time-hint")}
                    type="datetime-local"
                    onChange={(e) => update("occurredAt", e.target.value)}
                    required
                  />
                  {errorText("occurredAt")}
                  <span className="field-hint" id="time-hint">
                    Event time: India (IST, UTC+05:30). An estimate is fine.
                  </span>
                </div>
              </div>
            </fieldset>
            <fieldset disabled={busy !== null}>
              <legend>
                <span>3</span> A photo, if you have one <small>Optional</small>
              </legend>
              <p className="fieldset-description">
                Choose the item itself, without personal documents or people.
              </p>
              <label
                className={preview ? "upload-zone has-photo" : "upload-zone"}
                htmlFor="photo"
              >
                <input
                  ref={fileRef}
                  id="photo"
                  name="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={choosePhoto}
                  disabled={busy !== null}
                  aria-label="Choose an item photo"
                  aria-invalid={Boolean(photoError)}
                  aria-describedby={
                    photoError ? "photo-hint photo-error" : "photo-hint"
                  }
                />
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview of your selected item"
                    onError={() => {
                      clearPhoto();
                      setPhotoError(
                        "This image could not be opened. Choose another photo.",
                      );
                    }}
                  />
                ) : (
                  <>
                    <ImagePlus size={27} />
                    <strong>Choose an item photo</strong>
                    <span>JPG, PNG or WebP, up to 4 MB</span>
                  </>
                )}
              </label>
              {photo ? (
                <div className="photo-meta">
                  <span>{photo.name}</span>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={clearPhoto}
                  >
                    <X size={14} /> Remove photo
                  </button>
                </div>
              ) : null}
              {photo ? (
                <label className="sharing-choice">
                  <input
                    type="checkbox"
                    checked={sharePreview}
                    disabled={busy !== null}
                    onChange={(event) => {
                      setSharePreview(event.target.checked);
                      setIntakeId(null);
                      setAssistance(null);
                      setReviewing(false);
                    }}
                  />
                  <span>
                    <strong>Show a small item preview to signed-in attendees</strong>
                    <span>
                      Optional. Check this only if the image shows the item without
                      faces, documents, serial labels or a hidden ownership clue.
                      The original stays private for you and staff.
                    </span>
                  </span>
                </label>
              ) : null}
              {photoError ? (
                <p className="field-error" role="alert" id="photo-error">
                  {photoError}
                </p>
              ) : null}
              <p className="field-hint" id="photo-hint">
                JPG, PNG or WebP, up to 4 MB and 16 megapixels. Help describe this
                item sends the photo to OpenAI and public description and attributes
                to configured AI services. Ownership clues are excluded. Stored
                originals are accessible only to you and authorized staff. A
                smaller copy is shared only if you check the option above.
              </p>
            </fieldset>
            {found ? (
              <fieldset
                className="private-fieldset"
                disabled={busy !== null}
              >
                <legend>
                  <LockKeyhole size={17} /> Keep one clue private
                </legend>
                <p className="fieldset-description">
                  Record a hidden mark, an item inside, or another detail staff
                  can compare against a claim. Do not repeat it in the visible
                  description.
                </p>
                <div className="field">
                  <label htmlFor="privateClue">
                    Private identifying clue <span aria-hidden="true">*</span>
                  </label>
                  <textarea
                    {...fieldProps("privateClue")}
                    maxLength={2000}
                    rows={3}
                    placeholder="A detail only the owner and help-desk staff should know…"
                    onChange={(e) => update("privateClue", e.target.value)}
                    required
                  />
                  {errorText("privateClue")}
                </div>
              </fieldset>
            ) : null}
            <div className="form-bottom">
              <p>
                <LockKeyhole size={16} /> Your draft stays on this page until
                you leave or reload.
              </p>
              <button
                type="submit"
                disabled={busy !== null}
                className="button button-primary"
              >
                Review report <ArrowRight size={17} />
              </button>
            </div>
          </form>
          {reviewing ? (
            <section
              className="review-panel"
              ref={reviewRef}
              tabIndex={-1}
              aria-labelledby="review-title"
            >
              <div className="review-title">
                <span className="review-check">
                  <Check size={21} />
                </span>
                <div>
                  <p className="section-kicker">Ready for your review</p>
                  <h2 id="review-title">{draft.title.trim()}</h2>
                </div>
                <span className="draft-badge">Not submitted</span>
              </div>
              <dl className="review-details">
                <div>
                  <dt>Report type</dt>
                  <dd>{found ? "Found item" : "Lost item"}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{draft.category}</dd>
                </div>
                <div>
                  <dt>Color</dt>
                  <dd>{draft.color.trim() || "Not specified"}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{draft.location}</dd>
                </div>
                <div>
                  <dt>Approximate time</dt>
                  <dd>{draft.occurredAt.replace("T", " ")}</dd>
                </div>
                <div>
                  <dt>Photo</dt>
                  <dd>{photo ? (sharePreview ? "Small preview shared with signed-in attendees" : "Private original only") : "Not added"}</dd>
                </div>
              </dl>
              <p className="review-description">{draft.description.trim()}</p>
              {found ? (
                <p className="private-recorded">
                  <LockKeyhole size={15} /> Private identifying clue recorded in
                  this draft.
                </p>
              ) : null}
              <div className="submission-notice">
                <strong>Check the details before submitting.</strong>
                <p>
                  Public item details help find candidates. Your private
                  identifying clue and original photo stay restricted. If you
                  selected sharing, a smaller item preview will appear on
                  possible matches.
                </p>
                {found ? (
                  <p>
                    Please hand this item to help-desk staff. Saving a report
                    does not confirm that staff have received it.
                  </p>
                ) : null}
                {photo && !intakeId ? (
                  <p>
                    Your original photo is stored privately. Submitting a report does not
                    request AI analysis. Use Help describe this item to request
                    optional suggestions before submitting.
                  </p>
                ) : null}
              </div>
              <div className="review-actions">
                <button
                  type="button"
                  disabled={busy !== null}
                  className="text-action"
                  onClick={() => {
                    setReviewing(false);
                    document.getElementById("title")?.focus();
                  }}
                >
                  <Pencil size={15} /> Edit details
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  disabled={busy !== null}
                  onClick={submitReport}
                >
                  {busy === "submit" ? "Submitting report…" : "Submit report"}
                </button>
              </div>
              {requestError ? (
                <div className="error-summary" role="alert">
                  <p>{requestError}</p>
                  {needsSignIn ? (
                    <a href={session.signInHref} target="_top">
                      Sign in again (leaves this draft)
                    </a>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
        <aside className="report-aside">
          <div className="aside-tip">
            <ShieldCheck size={25} />
            <h2>
              {found
                ? "A clue worth keeping."
                : "The details make a difference."}
            </h2>
            <p>
              {found
                ? "A public description helps someone recognize their item. A private clue helps staff check that it belongs to them."
                : "Similar items can look alike. A place, a time, and visible details help narrow the search."}
            </p>
            <ul>
              <li>
                <Check size={15} /> Use an approximate time
              </li>
              <li>
                <Check size={15} /> Describe visible characteristics
              </li>
              <li>
                <Check size={15} /> Keep ownership proof private
              </li>
            </ul>
          </div>
          <div className="aside-location">
            <MapPin size={18} />
            <div>
              <strong>FoundIt Hackathon Help Desk</strong>
              <p>For items lost or found at the event.</p>
            </div>
          </div>
          <div className="aside-preview">
            <span className="development-label">Your report</span>
            <p>
              After submitting, you can return to My reports to check candidates
              and private recovery requests.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
