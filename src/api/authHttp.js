import http from "./http";

const login = (email,password) =>{
    const path = "/auth/login"
    return http.post(path,{email,password})

}

const resetpwd = (oldpwd,newpwd,newpwd2)=>{
    const path = "/auth/resetpwd"
    return http.post(path,{oldpwd,newpwd,newpwd2})

}

export default {
    login,resetpwd
}



