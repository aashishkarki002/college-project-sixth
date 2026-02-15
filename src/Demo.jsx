import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
function Demo() {

  const [add, setAdd] = useState(0)
  useEffect(() => {
    alert("Hello");
  }, [add]);
  function addTenant() {
    setAdd(add + 1);
  }
  ;
 
  return (
    <div>
    <Button onClick={addTenant} className="bg-blue-500 text-white p-2 rounded-md"
    >Add Tenant</Button>
    <p>{add}</p>
    </div>
  )
}

export default Demo;  