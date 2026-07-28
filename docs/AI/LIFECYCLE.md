# Shared Batch Lifecycle

## Canonical Lifecycle

```text
ASSIGNED
↓
PROCESSING
↓
COMPLETED
↓
READY_FOR_DOWNLOAD
↓
DOWNLOADED
```

## State Descriptions

- ASSIGNED: A Shared Batch has been assigned to a branch and is awaiting processing.
- PROCESSING: Branch officers are actively processing the assigned transactions.
- COMPLETED: All required processing for the batch has been completed.
- READY_FOR_DOWNLOAD: The batch has completed processing and is ready for the Direct Remit Officer to download proof files.
- DOWNLOADED: The batch has been downloaded and the REOS-side download workflow is complete.

## Allowed Transitions

- ASSIGNED -> PROCESSING
- PROCESSING -> COMPLETED
- COMPLETED -> READY_FOR_DOWNLOAD
- READY_FOR_DOWNLOAD -> DOWNLOADED

## Forbidden Transitions

- ASSIGNED -> COMPLETED
- ASSIGNED -> READY_FOR_DOWNLOAD
- ASSIGNED -> DOWNLOADED
- PROCESSING -> READY_FOR_DOWNLOAD
- PROCESSING -> DOWNLOADED
- COMPLETED -> DOWNLOADED
- READY_FOR_DOWNLOAD -> PROCESSING
- DOWNLOADED -> any other state

## Role Ownership

- Direct Remit Officer: moves a batch from ASSIGNED to PROCESSING only when the batch is accepted into workflow.
- Branch Officer: moves a batch through PROCESSING and COMPLETED based on branch processing progress.
- Direct Remit Officer: moves a batch from COMPLETED to READY_FOR_DOWNLOAD when the batch is prepared for proof download.
- Direct Remit Officer: moves a batch from READY_FOR_DOWNLOAD to DOWNLOADED after the download workflow is completed.
