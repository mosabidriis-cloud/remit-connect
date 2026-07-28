import type { ChangeEvent } from "react";

type SharedBatchUploadFormProps = {
  onUpload: (file: File) => void;
};

export function SharedBatchUploadForm({ onUpload }: SharedBatchUploadFormProps) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="rounded border border-slate-200 bg-white p-6">
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Direct Remit batch file
        <input
          accept=".csv,text/csv"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          onChange={handleFileChange}
          type="file"
        />
      </label>
    </div>
  );
}
