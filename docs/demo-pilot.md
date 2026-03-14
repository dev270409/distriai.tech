# Pilot Demo (1000 immagini)

## Nuove API

- `POST /api/demo/start-task`
  - body: `{ "image_id": 1..1000 }`
  - crea un task nella tabella `demo_tasks` e inizializza i log simulati.
- `GET /api/demo/task-status?task_id=<uuid>`
  - ritorna lo stato proiettato del task lungo la pipeline:
    `SUBMITTING -> FRAGMENTING -> SCHEDULING -> EXECUTING -> VALIDATING -> COMPLETED`.

## Esempio di audit trail finale

```json
{
  "task_id": "3dbec142-4d12-4302-b849-2c3653708755",
  "image_id": 241,
  "hashes": {
    "submission_hash": "0x4a06...",
    "fragment_root_hash": "0x4cb2...",
    "execution_trace_hash": "0x340f...",
    "consensus_hash": "0x18af...",
    "delivery_hash": "0x7f91..."
  },
  "proof_mode": "EXECUTION_TRACE_HASH",
  "verification": {
    "deterministic_replay": true,
    "validator_quorum_met": true,
    "signatures_collected": 3
  }
}
```

## Frontend polling helper (React)

Usa `frontend/src/lib/demoTaskClient.js`:

- `startDemoTask(imageId)`
- `fetchDemoTaskStatus(taskId)`
- `subscribeToDemoTask(taskId, { onUpdate, onCompleted, onError })`

Questa utility permette di mostrare avanzamento realtime della pipeline nella dashboard.
 codex/integrate-pilot-demo-for-1000-images-8klg5c


## Nota operativa

Se Supabase non è configurato correttamente o la migration `20260314_demo_tasks.sql` non è stata eseguita, `POST /api/demo/start-task` avvia comunque la demo in modalità temporanea `in-memory` e ritorna un campo `warning` nella risposta.

 main
