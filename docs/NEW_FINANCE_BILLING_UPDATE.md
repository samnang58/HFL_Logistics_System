# HFL Logistics — New Billing & Payment Update

## Added
- Partial payment support
- Payment method selection
- Payment remark/note
- Payment history by customer
- Customer statement modal
- Invoice print action
- Outstanding balance tracking
- Receipt IDs (`HFL-PAY-xxxxxx`)
- Invoice status transitions: Unpaid → Partially Paid → Paid

## Important
This update improves the existing frontend/local billing workflow. The project still contains local-service modules and should be connected to the Laravel API/MySQL backend before production use. Do not treat localStorage financial records as the production source of truth.
