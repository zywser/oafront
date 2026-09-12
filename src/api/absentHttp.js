import http from "./http";

const getAbsentTypes = ()=>{
    const path = "/type"
    return http.get(path)

}


const getResponder  =()=>{
    const path = "/responder"
    return http.get(path)

    
}

const applyAbsent = (data)=>{
    const path = "/absent/"
    return http.post(path,data)
}


const getAbsents=(page=1)=>{
    const path = "/absent?who=my&page="+page
    return http.get(path)

}

const getSubabsents=(page=1)=>{
    const path = "/absent?who=sub&page="+page
    return http.get(path)

    
}


const handleSubAbsent=(absent_id,status,response_content)=>{
      const path = "/absent/" + absent_id + "/"
      return http.put(path,{status,response_content})


}
export default{

    getAbsentTypes,
    getResponder,
    applyAbsent,
    getAbsents,
    getSubabsents,
    handleSubAbsent,
}
  
