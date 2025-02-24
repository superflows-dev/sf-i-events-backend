export const getCompletenessStatus = (complianceData) => {

    if(complianceData.comments == null || complianceData.comments.length === 0) {
      return "not-started";
    } else {
        if(complianceData.approved != null && complianceData.approved) {
            return "approved";
        } else {
            if(complianceData.comments[complianceData.comments.length - 1].author == "Reporter") {
                return "pending-approval";
            } else {
                return "rejected";
            }
        }
    }
}