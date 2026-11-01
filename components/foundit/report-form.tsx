"use client";

import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { ArrowLeft, ArrowRight, Check, ImagePlus, LockKeyhole, MapPin, Pencil, ShieldCheck, X } from "lucide-react";
import { categories, locations, emptyDraft, validateDraft, validatePhoto, type Draft, type DraftErrors, type ReportKind } from "@/lib/client/report-draft";

export function ReportForm({ kind }: { kind: ReportKind }) {
  const [draft, setDraft] = useState<Draft>({ ...emptyDraft });
  const [errors, setErrors] = useState<DraftErrors>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const previewRef = useRef("");
  const summaryRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const found = kind === "found";

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);
  useEffect(() => { if (reviewing) reviewRef.current?.focus(); }, [reviewing]);

  function update(field: keyof Draft, value: string) {
    setDraft(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
    setReviewing(false);
  }
  function clearPhoto() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setPreview(""); setPhoto(null); setPhotoError(""); setReviewing(false);
    if (fileRef.current) fileRef.current.value = "";
  }
  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    clearPhoto();
    const error = validatePhoto(file);
    if (error) { setPhotoError(error); return; }
    const url = URL.createObjectURL(file);
    previewRef.current = url; setPreview(url); setPhoto(file);
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
    const describedBy = [errors[field] ? field + "-error" : null, hintId].filter(Boolean).join(" ");
    return { id: field, name: field, value: draft[field], "aria-invalid": Boolean(errors[field]), "aria-describedby": describedBy || undefined };
  }
  function errorText(field: keyof Draft) {
    return errors[field] ? <span className="field-error" id={field + "-error"}>{errors[field]}</span> : null;
  }
  return <main id="main-content" className="site-width report-page">
    <a href="/" className="back-link"><ArrowLeft size={15}/> Back to help desk</a>
    <div className="report-heading"><p className="section-kicker">{found ? "A good find deserves a way home" : "Let’s start with what you remember"}</p><h1>{found ? "Found something?" : "What went missing?"}</h1><p>{found ? "A few details can help connect an item with the person looking for it." : "You don’t need every detail. Start with the item, the place, and an approximate time."}</p></div>
    <div className="report-layout"><div>
      <nav className="kind-switch" aria-label="Report type"><a href="/report/lost" aria-current={!found ? "page" : undefined}>I lost something</a><a href="/report/found" aria-current={found ? "page" : undefined}>I found something</a></nav>
      <p className="form-preview-note"><strong>Frontend preview.</strong> Review a draft here; submission is not connected yet.</p>
      <form className="report-form" onSubmit={review} autoComplete="off" noValidate>
        {Object.values(errors).some(Boolean) ? <div className="error-summary" ref={summaryRef} tabIndex={-1} role="alert"><strong>Check the highlighted fields.</strong><p>Your details are still here. Complete the missing information to review your report.</p></div> : null}
        <fieldset><legend><span>1</span> Tell us about the item</legend><p className="fieldset-description">Describe what someone could see. Keep identifying secrets for the private check.</p>
          <div className="field"><label htmlFor="title">Item name <span aria-hidden="true">*</span></label><input {...fieldProps("title")} maxLength={120} placeholder="e.g. Navy laptop backpack" onChange={e=>update("title",e.target.value)} required/>{errorText("title")}</div>
          <div className="field-row"><div className="field"><label htmlFor="category">Category <span aria-hidden="true">*</span></label><select {...fieldProps("category")} onChange={e=>update("category",e.target.value)} required><option value="">Choose a category</option>{categories.map(category=><option key={category}>{category}</option>)}</select>{errorText("category")}</div><div className="field"><label htmlFor="color">Main color <small>Optional</small></label><input {...fieldProps("color")} maxLength={80} placeholder="e.g. Navy blue" onChange={e=>update("color",e.target.value)}/></div></div>
          <div className="field"><label htmlFor="description">Visible details <span aria-hidden="true">*</span></label><textarea {...fieldProps("description", "description-hint")} maxLength={2000} rows={4} placeholder="Shape, material, or other visible details. Leave out serial numbers and hidden identifying clues." onChange={e=>update("description",e.target.value)} required/>{errorText("description")}<span className="field-hint" id="description-hint">Keep private clues out of this description.</span></div>
        </fieldset>
        <fieldset><legend><span>2</span> Where and when?</legend><p className="fieldset-description">An estimate is fine. Choose the closest event area.</p>
          <div className="field-row"><div className="field"><label htmlFor="location">Event location <span aria-hidden="true">*</span></label><select {...fieldProps("location")} onChange={e=>update("location",e.target.value)} required><option value="">Choose a location</option>{locations.map(location=><option key={location}>{location}</option>)}</select>{errorText("location")}</div><div className="field"><label htmlFor="occurredAt">{found ? "When you found it" : "Last seen"} <span aria-hidden="true">*</span></label><input {...fieldProps("occurredAt", "time-hint")} type="datetime-local" onChange={e=>update("occurredAt",e.target.value)} required/>{errorText("occurredAt")}<span className="field-hint" id="time-hint">Use the local time where the item was seen.</span></div></div>
        </fieldset>
        <fieldset><legend><span>3</span> A photo, if you have one <small>Optional</small></legend><p className="fieldset-description">Choose the item itself, without personal documents or people.</p>
          <label className={preview ? "upload-zone has-photo" : "upload-zone"} htmlFor="photo"><input ref={fileRef} id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} aria-label="Choose an item photo" aria-invalid={Boolean(photoError)} aria-describedby={photoError ? "photo-hint photo-error" : "photo-hint"}/>{preview ? <img src={preview} alt="Preview of your selected item" onError={()=>{clearPhoto(); setPhotoError("This image could not be opened. Choose another photo.");}}/> : <><ImagePlus size={27}/><strong>Choose an item photo</strong><span>JPG, PNG or WebP, up to 4 MB</span></>}</label>
          {photo ? <div className="photo-meta"><span>{photo.name}</span><button type="button" onClick={clearPhoto}><X size={14}/> Remove photo</button></div> : null}
          {photoError ? <p className="field-error" role="alert" id="photo-error">{photoError}</p> : null}
          <p className="field-hint" id="photo-hint">JPG, PNG or WebP, up to 4 MB. The image preview stays on this page; nothing is uploaded in this frontend preview.</p>
        </fieldset>
        {found ? <fieldset className="private-fieldset"><legend><LockKeyhole size={17}/> Keep one clue private</legend><p className="fieldset-description">Record a hidden mark, an item inside, or another detail staff can compare against a claim. Do not repeat it in the visible description.</p><div className="field"><label htmlFor="privateClue">Private identifying clue <span aria-hidden="true">*</span></label><textarea {...fieldProps("privateClue")} maxLength={2000} rows={3} placeholder="A detail only the owner and help-desk staff should know…" onChange={e=>update("privateClue",e.target.value)} required/>{errorText("privateClue")}</div></fieldset> : null}
        <div className="form-bottom"><p><LockKeyhole size={16}/> Your draft stays on this page until you leave or reload.</p><button type="submit" className="button button-primary">Review report <ArrowRight size={17}/></button></div>
      </form>
      {reviewing ? <section className="review-panel" ref={reviewRef} tabIndex={-1} aria-labelledby="review-title"><div className="review-title"><span className="review-check"><Check size={21}/></span><div><p className="section-kicker">Ready for your review</p><h2 id="review-title">{draft.title.trim()}</h2></div><span className="draft-badge">Not submitted</span></div><dl className="review-details"><div><dt>Report type</dt><dd>{found ? "Found item" : "Lost item"}</dd></div><div><dt>Category</dt><dd>{draft.category}</dd></div><div><dt>Color</dt><dd>{draft.color.trim() || "Not specified"}</dd></div><div><dt>Location</dt><dd>{draft.location}</dd></div><div><dt>Approximate time</dt><dd>{draft.occurredAt.replace("T"," ")}</dd></div><div><dt>Photo</dt><dd>{photo ? "Selected for preview" : "Not added"}</dd></div></dl><p className="review-description">{draft.description.trim()}</p>{found ? <p className="private-recorded"><LockKeyhole size={15}/> Private identifying clue recorded in this draft.</p> : null}<div className="submission-notice" role="status"><strong>Submission is not available yet.</strong><p>The service is being connected. This report has not been saved or sent. Keep this page open to retain your draft.</p></div><div className="review-actions"><button type="button" className="text-action" onClick={()=>{setReviewing(false); document.getElementById("title")?.focus();}}><Pencil size={15}/> Edit details</button><button type="button" className="button button-primary" disabled aria-describedby="submit-pending">Submit report</button></div><p className="field-hint" id="submit-pending">Available once report submission is connected.</p></section> : null}
    </div><aside className="report-aside"><div className="aside-tip"><ShieldCheck size={25}/><h2>{found ? "A clue worth keeping." : "The details make a difference."}</h2><p>{found ? "A public description helps someone recognize their item. A private clue helps staff check that it belongs to them." : "Similar items can look alike. A place, a time, and visible details help narrow the search."}</p><ul><li><Check size={15}/> Use an approximate time</li><li><Check size={15}/> Describe visible characteristics</li><li><Check size={15}/> Keep ownership proof private</li></ul></div><div className="aside-location"><MapPin size={18}/><div><strong>FoundIt Hackathon Help Desk</strong><p>For items lost or found at the event.</p></div></div><div className="aside-preview"><span className="development-label">Frontend preview</span><p>Report creation, AI assistance, and matching will be connected in the next integration checkpoint.</p></div></aside></div>
  </main>;
}
