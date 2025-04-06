;; Testing Certification Contract
;; Records compliance with safety standards

(define-data-var admin principal tx-sender)

;; Structure for certification data
(define-map equipment-certifications
  { equipment-id: (string-ascii 64), standard-id: (string-ascii 64) }
  {
    certified-by: principal,
    certification-date: uint,
    expiration-date: uint,
    is-valid: bool
  })

;; Add or update certification
(define-public (certify-equipment
                (equipment-id (string-ascii 64))
                (standard-id (string-ascii 64))
                (expiration-date uint))
  (begin
    (asserts! (> expiration-date block-height) (err u101))
    (ok (map-set equipment-certifications
                { equipment-id: equipment-id, standard-id: standard-id }
                {
                  certified-by: tx-sender,
                  certification-date: block-height,
                  expiration-date: expiration-date,
                  is-valid: true
                }))))

;; Revoke certification
(define-public (revoke-certification
                (equipment-id (string-ascii 64))
                (standard-id (string-ascii 64)))
  (let ((certification (unwrap! (map-get? equipment-certifications
                                          { equipment-id: equipment-id, standard-id: standard-id })
                               (err u102))))
    (asserts! (or (is-eq tx-sender (var-get admin))
                 (is-eq tx-sender (get certified-by certification)))
             (err u100))
    (ok (map-set equipment-certifications
                { equipment-id: equipment-id, standard-id: standard-id }
                (merge certification { is-valid: false })))))

;; Check if equipment is certified for a standard
(define-read-only (is-certified
                  (equipment-id (string-ascii 64))
                  (standard-id (string-ascii 64)))
  (let ((certification (map-get? equipment-certifications
                                { equipment-id: equipment-id, standard-id: standard-id })))
    (if (is-some certification)
        (let ((cert (unwrap! certification false)))
          (and (get is-valid cert)
               (< block-height (get expiration-date cert))))
        false)))

;; Get certification details
(define-read-only (get-certification
                  (equipment-id (string-ascii 64))
                  (standard-id (string-ascii 64)))
  (map-get? equipment-certifications
           { equipment-id: equipment-id, standard-id: standard-id }))

