;; Operator Training Contract
;; Tracks qualified personnel for specific machinery

(define-data-var admin principal tx-sender)

;; Structure for operator qualifications
(define-map operator-qualifications
  { operator: principal, equipment-type: (string-ascii 64) }
  {
    certified-by: principal,
    certification-date: uint,
    expiration-date: uint,
    training-level: uint,
    is-valid: bool
  })

;; Add or update operator qualification
(define-public (certify-operator
                (operator principal)
                (equipment-type (string-ascii 64))
                (training-level uint)
                (expiration-date uint))
  (begin
    (asserts! (> expiration-date block-height) (err u101))
    (ok (map-set operator-qualifications
                { operator: operator, equipment-type: equipment-type }
                {
                  certified-by: tx-sender,
                  certification-date: block-height,
                  expiration-date: expiration-date,
                  training-level: training-level,
                  is-valid: true
                }))))

;; Revoke operator qualification
(define-public (revoke-qualification
                (operator principal)
                (equipment-type (string-ascii 64)))
  (let ((qualification (unwrap! (map-get? operator-qualifications
                                         { operator: operator, equipment-type: equipment-type })
                               (err u102))))
    (asserts! (or (is-eq tx-sender (var-get admin))
                 (is-eq tx-sender (get certified-by qualification)))
             (err u100))
    (ok (map-set operator-qualifications
                { operator: operator, equipment-type: equipment-type }
                (merge qualification { is-valid: false })))))

;; Check if operator is qualified for equipment
(define-read-only (is-qualified
                  (operator principal)
                  (equipment-type (string-ascii 64)))
  (let ((qualification (map-get? operator-qualifications
                                { operator: operator, equipment-type: equipment-type })))
    (if (is-some qualification)
        (let ((qual (unwrap! qualification false)))
          (and (get is-valid qual)
               (< block-height (get expiration-date qual))))
        false)))

;; Get qualification details
(define-read-only (get-qualification
                  (operator principal)
                  (equipment-type (string-ascii 64)))
  (map-get? operator-qualifications
           { operator: operator, equipment-type: equipment-type }))

