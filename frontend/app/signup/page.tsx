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
       <div className="flex min-h-0 flex-1 items-center justify-center bg-background">
           <div className="w-[360px]">
           <div className="bg-white shadow-md rounded-xl border border-[#B2C9AD] p-[45px] text-center">


           <form className="space-y-4" onSubmit={handleSignup}>
               <h1 className="text-[#4B5945] text-3xl font-extrabold mb-6">Create an Account</h1>
               <input
                   type="text"
                   placeholder="Name"
                   value={name}
                   onChange={(n) => setName(n.target.value)}
                   className="w-full rounded-lg border border-[#B2C9AD] bg-white p-[15px] text-sm outline-none text-[#474747] focus:border-[#91AC8F] transition-colors"
               />
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
               <button className="w-full bg-[#4B5945] text-white py-[15px] rounded-lg font-semibold hover:bg-[#66785F] transition">
                Create Account
                </button>
                {message && (
                   <p className="text-sm text-gray-600">{message}</p>
                )}
               <p className="text-[#898989] text-xs mt-4">
                   Already registered?{" "}
                   <Link href="/login" className="text-[#4B5945] no-underline hover:text-[#66785F] transition">
                       Sign In
                   </Link>
               </p>
           </form>


           </div>
           </div>
       </div></>
   );
}
