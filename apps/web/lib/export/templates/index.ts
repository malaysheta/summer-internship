// Week 4 export template update
import { rtiTemplate } from "./rti.tpl";
import { legalNoticeTemplate } from "./legal-notice.tpl";
import { ndaTemplate } from "./nda.tpl";
import { consumerComplaintTemplate } from "./consumer-complaint.tpl";
import { chequeBounceTemplate } from "./cheque-bounce.tpl";

export function getTemplate(docType: string) {
  switch (docType) {
    case "rti_application":
    case "rti":
      return rtiTemplate;

    case "legal_notice":
      return legalNoticeTemplate;

    case "nda":
      return ndaTemplate;

    case "consumer_complaint":
      return consumerComplaintTemplate;

    case "cheque_bounce_notice":
    case "cheque_bounce":
      return chequeBounceTemplate;

    default:
      return rtiTemplate;
  }
}