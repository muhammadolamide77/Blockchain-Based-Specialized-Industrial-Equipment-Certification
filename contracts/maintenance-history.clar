;; Maintenance History Contract
;; Documents service and repairs over time

(define-data-var admin principal tx-sender)

;; Structure for maintenance records
(define-map maintenance-records
  { equipment-id: (string-ascii 64), record-id: uint }
  {
    performed-by: principal,
    maintenance-date: uint,
    maintenance-type: (string-ascii 64),
    description: (string-ascii 256),
    next-maintenance-due: uint
  })

;; Counter for record IDs
(define-data-var record-counter uint u0)

;; Add maintenance record
(define-public (add-maintenance-record
                (equipment-id (string-ascii 64))
                (maintenance-type (string-ascii 64))
                (description (string-ascii 256))
                (next-maintenance-due uint))
  (let ((new-id (+ (var-get record-counter) u1)))
    (var-set record-counter new-id)
    (ok (map-set maintenance-records
                { equipment-id: equipment-id, record-id: new-id }
                {
                  performed-by: tx-sender,
                  maintenance-date: block-height,
                  maintenance-type: maintenance-type,
                  description: description,
                  next-maintenance-due: next-maintenance-due
                }))))

;; Get maintenance record
(define-read-only (get-maintenance-record
                  (equipment-id (string-ascii 64))
                  (record-id uint))
  (map-get? maintenance-records
           { equipment-id: equipment-id, record-id: record-id }))

;; Check if maintenance is due
(define-read-only (is-maintenance-due
                  (equipment-id (string-ascii 64))
                  (record-id uint))
  (let ((record (map-get? maintenance-records
                         { equipment-id: equipment-id, record-id: record-id })))
    (if (is-some record)
        (let ((rec (unwrap! record false)))
          (>= block-height (get next-maintenance-due rec)))
        false)))

;; Get current record counter
(define-read-only (get-record-counter)
  (var-get record-counter))

