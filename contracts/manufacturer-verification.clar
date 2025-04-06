;; Manufacturer Verification Contract
;; Validates legitimate equipment producers

(define-data-var admin principal tx-sender)

;; Map of verified manufacturers
(define-map verified-manufacturers principal bool)

;; Add a new manufacturer
(define-public (add-manufacturer (manufacturer principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u100))
    (ok (map-set verified-manufacturers manufacturer true))))

;; Remove a manufacturer
(define-public (remove-manufacturer (manufacturer principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u100))
    (ok (map-delete verified-manufacturers manufacturer))))

;; Check if a manufacturer is verified
(define-read-only (is-verified-manufacturer (manufacturer principal))
  (default-to false (map-get? verified-manufacturers manufacturer)))

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u100))
    (ok (var-set admin new-admin))))

