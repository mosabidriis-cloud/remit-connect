import type { ChangeEvent } from "react";

type ProofUploadProps = {
  onUpload: (files: File[]) => void;
};

export function ProofUpload({ onUpload }: ProofUploadProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length > 0) {
      onUpload(files);
      event.target.value = "";
    }
  };

  return (
    <label className="grid gap-2 rounded border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700">
      Upload Proof
      <input accept="image/*" className="rounded border border-slate-300 px-3 py-2 text-sm" multiple onChange={handleChange} type="file" />
    </label>
  );
}
