import http from "./http";


const getAllDepartment = () =>{
    const path = "/staff/departments"
    return http.get(path)
}



const addstaff =(realname,email,password) =>{
    const path = "/staff/staff"
    return http.post(path,{realname,email,password})

}


const getstafflist = (page=1,size=10,params)=>{
    const path = `/staff/staff`
    params = params?params:{}
    params["page"] = page
    params["size"] = size
    return http.get(path,params)
}


const updateStaffStatus = (staff_id,status)=>{
    const path = "staff/staff/"+staff_id
    return http.put(path,{status})

}

const downloadStaffs = (pks)=>{
    const path = "staff/download"
    return http.downloadFile(path,{"pks":JSON.stringify(pks)})
}

const deleteStaff = (staff_id)=>{
    const path = "staff/staff/"+staff_id
    return http.delete(path)
}

export default{
    getAllDepartment,
    addstaff,
    getstafflist,
    updateStaffStatus,
    downloadStaffs,
    deleteStaff
}
