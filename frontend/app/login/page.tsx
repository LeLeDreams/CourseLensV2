"use client"


import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";


export default function Login() {
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [message, setMessage] = useState("");
   const router = useRouter();
   const { showToast } = useToast();

   const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
  
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
  
    if (error) {
      setMessage(error.message);
      showToast("Login failed.", "error");
    } else {
      showToast("Login successful.", "success");
      router.push("/courses");
    }
  };

   return (<>
       <div className="flex min-h-0 flex-1 items-center justify-center bg-background">
           <div className="w-[360px]">
           <div className="bg-white shadow-md rounded-xl border border-[#B2C9AD] p-[45px] text-center">


           <form className="space-y-4" onSubmit={handleLogin}>
               <h1 className="text-[#4B5945] text-3xl font-bold mb-6">Sign In</h1>
               <input
                   type="email"
                   placeholder="Email"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="w-full rounded-lg border border-[#B2C9AD] bg-white p-[15px] text-sm outline-none text-[#474747] focus:border-[#91AC8F] transition-colors"
               />
               <input
                   type="password"
                   placeholder="Password"
                   value={password}
                   onChange={(p) => setPassword(p.target.value)}
                   className="w-full rounded-lg border border-[#B2C9AD] bg-white p-[15px] text-sm outline-none text-[#474747] focus:border-[#91AC8F] transition-colors"
               />
               <button className="w-full bg-[#4B5945] text-white py-[15px] rounded-lg font-semibold hover:bg-[#66785F] transition">Sign In</button>
               {message && <p className="text-sm text-red-500">{message}</p>}
               <p className="text-[#898989] text-xs mt-4">
                   Not registered?{" "}
                   <Link href="/signup" className="text-[#4B5945] no-underline hover:text-[#66785F] transition">
                       Create an account
                   </Link>
               </p>
           </form>


           </div>
           </div>
       </div></>
   );
}


