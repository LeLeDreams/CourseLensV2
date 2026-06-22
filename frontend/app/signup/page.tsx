"use client"


import { useToast } from "@/components/ToastProvider";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";


export default function Signup() {
   const [name, setName] = useState("");
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [message, setMessage] = useState("");
   const { showToast } = useToast();

   const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
            student_name: name,
        },
      },
    });

    if (error) {
        setMessage(error.message);
        showToast("Signup failed.", "error");
    } else {
        setMessage("Check your email to confirm your account.");
        showToast("Signup successful.", "success");
    }

    const user = data.user;

    if (user) {
        const { error: insertError } = await supabase
        .from("student_profiles")
        .insert([
            {
            email: email,
            student_name: name,
            user_id: user.id
            },
        ]);

        if (insertError) {
        setMessage(insertError.message);
        return;
        }
    }
    

    setMessage("Check your email to confirm your account.");
    
  };


   return (<>
       <div className="flex min-h-0 flex-1 items-center justify-center bg-[#f8f9fa]">
           <div className="w-[360px]">
           <div className="bg-white shadow-[0_0_20px_rgba(0,0,0,0.2),0_5px_5px_rgba(0,0,0,0.24)] p-[45px] text-center">


           <form className="space-y-4" onSubmit={handleSignup}>
               <h1 className="text-[#2868ce] text-3xl font-extrabold mb-6">Create an Account</h1>
               <input
                   type="text"
                   placeholder="Name"
                   value={name}
                   onChange={(n) => setName(n.target.value)}
                   className="w-full bg-[#f2f2f2] p-[15px] text-sm outline-none text-[#474747]"
               />
               <input
                   type="email"
                   placeholder="Email"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="w-full bg-[#f2f2f2] p-[15px] text-sm outline-none text-[#474747]"
               />
               <input
                   type="password"
                   placeholder="Password"
                   value={password}
                   onChange={(p) => setPassword(p.target.value)}
                   className="w-full bg-[#f2f2f2] p-[15px] text-sm outline-none text-[#474747]"
               />
               <button className="w-full bg-[#3775d8] text-white py-[15px] font-bold uppercase hover:bg-[#1a50a7] transition">
                Create
                </button>
                {message && (
                   <p className="text-sm text-gray-600">{message}</p>
                )}
               <p className="text-[#898989] text-xs mt-4">
                   Already registered?{" "}
                   <Link href="/login" className="text-[#2868ce] no-underline hover:text-[#113b7d] transition">
                       Sign In
                   </Link>
               </p>
           </form>


           </div>
           </div>
       </div></>
   );
}
