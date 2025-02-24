
export const processIsInCurrentFincal = async (mm,yyyy,year) => {
    
    const currYear = year;
    const currMonth = new Date().getMonth() + 1;
    
    // console.log('curryear', currYear, 'currMonth', currMonth);
    
    if(currMonth < 4) {
        
        if(yyyy == currYear) {
            if(mm < 4) {
                return true;
            } else {
                return false;
            }    
        } else if(parseInt(yyyy + "") == (parseInt(currYear) - 1)) {
            if(mm >= 4) {
                return true;
            } else {
                return false;
            }
        }
        
    } else {
        
        if(yyyy == currYear) {
            if(mm >= 4) {
                return true;
            } else {
                return false;
            }    
        }else if(parseInt(yyyy + "") == (parseInt(currYear) + 1)) {
            if(mm < 4) {
                return true;
            } else {
                return false;
            }
        }
    }

}