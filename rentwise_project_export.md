# Rentwise — Project Export & Specifications

## Overview
Rentwise is a minimalist everyday rental utility tailored for UC San Diego students to explore nearby apartments and calculate transparent monthly living costs and roommate splits.

---

## 1. `explore.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Apartments near UC San Diego — Rentwise</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-[#FAFAFA] text-[#1E293B] antialiased min-h-screen flex flex-col justify-between">

  <!-- Header Navigation -->
  <header class="w-full bg-white border-b border-[#F1F5F9] py-5 px-8 sm:px-16 flex items-center justify-between sticky top-0 z-30">
    <div class="font-bold text-xl tracking-tight text-[#0F172A]">Rentwise</div>
    <nav class="flex items-center gap-8 text-sm font-medium text-[#64748B]">
      <a href="explore.html" class="text-[#0F172A] font-semibold">Explore</a>
      <a href="calculator.html" class="hover:text-[#0F172A] transition-colors">Calculator</a>
      <a href="#" class="hover:text-[#0F172A] transition-colors">About</a>
    </nav>
  </header>

  <!-- Main Content -->
  <main class="max-w-5xl mx-auto px-6 py-12 w-full flex-1">
    
    <div class="mb-8">
      <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-[#0F172A]">Apartments near UC San Diego</h1>
      <p class="text-[#64748B] text-base mt-2">Curated off-campus rentals in UTC and La Jolla with room-by-room split calculations.</p>
    </div>

    <!-- Search Input -->
    <div class="relative mb-4">
      <span class="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#94A3B8]">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
      <input 
        type="text" 
        placeholder="Search by neighborhood, street, or commute stop..." 
        class="w-full bg-white border border-[#E2E8F0] rounded-xl py-3 pl-11 pr-4 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] outline-none shadow-sm transition-all"
      />
    </div>

    <!-- Filter Pills & Results Count -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-8">
      <div class="flex flex-wrap items-center gap-2">
        <button class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0F172A] text-white">2 Bedrooms</button>
        <button class="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] transition-colors">Under $4,000</button>
        <button class="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] transition-colors">Near MTS Trolley</button>
        <button class="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] transition-colors">All filters</button>
      </div>
      <span class="text-xs text-[#94A3B8]">Showing 3 properties</span>
    </div>

    <!-- Property Listings -->
    <div class="space-y-6">

      <!-- Property 1 -->
      <article class="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow">
        <div class="md:w-5/12 h-64 md:h-auto overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=80" 
            alt="The Coastal at La Jolla UTC" 
            class="w-full h-full object-cover"
          />
        </div>
        <div class="p-6 md:p-7 md:w-7/12 flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 class="text-xl font-bold text-[#0F172A]">The Coastal at La Jolla UTC</h2>
                <p class="text-xs text-[#64748B] mt-0.5">8540 Costa Verde Blvd, San Diego, CA 92122</p>
              </div>
              <button aria-label="Save listing" class="text-[#94A3B8] hover:text-[#0F172A] transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
            <p class="text-xs text-[#475569] font-medium mt-3">2 Bed, 2 Bath &bull; 1,020 sq ft &bull; 6 min MTS SuperLoop to Price Center</p>
          </div>

          <div class="mt-6 pt-5 border-t border-[#F8FAFC]">
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span class="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Total Lease</span>
                <span class="text-lg font-bold text-[#0F172A]">$3,600<span class="text-xs font-normal text-[#64748B]">/mo</span></span>
              </div>
              <div>
                <span class="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Roommate Split</span>
                <span class="text-lg font-bold text-[#0F172A]">$1,800<span class="text-xs font-normal text-[#64748B]">/person</span></span>
              </div>
            </div>
            <a href="calculator.html" class="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-sm rounded-xl flex items-center justify-center transition-colors">
              Calculate rent split
            </a>
          </div>
        </div>
      </article>

      <!-- Property 2 -->
      <article class="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow">
        <div class="md:w-5/12 h-64 md:h-auto overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80" 
            alt="Regents La Jolla" 
            class="w-full h-full object-cover"
          />
        </div>
        <div class="p-6 md:p-7 md:w-7/12 flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 class="text-xl font-bold text-[#0F172A]">Regents La Jolla</h2>
                <p class="text-xs text-[#64748B] mt-0.5">9253 Regents Rd, La Jolla, CA 92037</p>
              </div>
              <button aria-label="Save listing" class="text-[#94A3B8] hover:text-[#0F172A] transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
            <p class="text-xs text-[#475569] font-medium mt-3">2 Bed, 2 Bath &bull; 1,065 sq ft &bull; Walk to UTC Westfield &amp; bus lines</p>
          </div>

          <div class="mt-6 pt-5 border-t border-[#F8FAFC]">
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span class="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Total Lease</span>
                <span class="text-lg font-bold text-[#0F172A]">$3,450<span class="text-xs font-normal text-[#64748B]">/mo</span></span>
              </div>
              <div>
                <span class="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Roommate Split</span>
                <span class="text-lg font-bold text-[#0F172A]">$1,725<span class="text-xs font-normal text-[#64748B]">/person</span></span>
              </div>
            </div>
            <a href="calculator.html" class="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-sm rounded-xl flex items-center justify-center transition-colors">
              Calculate rent split
            </a>
          </div>
        </div>
      </article>

      <!-- Property 3 -->
      <article class="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow">
        <div class="md:w-5/12 h-64 md:h-auto overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80" 
            alt="Nobel Court Apartments" 
            class="w-full h-full object-cover"
          />
        </div>
        <div class="p-6 md:p-7 md:w-7/12 flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 class="text-xl font-bold text-[#0F172A]">Nobel Court Apartments</h2>
                <p class="text-xs text-[#64748B] mt-0.5">3707 Nobel Dr, San Diego, CA 92122</p>
              </div>
              <button aria-label="Save listing" class="text-[#94A3B8] hover:text-[#0F172A] transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
            <p class="text-xs text-[#475569] font-medium mt-3">2 Bed, 1.5 Bath &bull; 940 sq ft &bull; Near Nobel Dr Blue Line Station</p>
          </div>

          <div class="mt-6 pt-5 border-t border-[#F8FAFC]">
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span class="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Total Lease</span>
                <span class="text-lg font-bold text-[#0F172A]">$3,200<span class="text-xs font-normal text-[#64748B]">/mo</span></span>
              </div>
              <div>
                <span class="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Roommate Split</span>
                <span class="text-lg font-bold text-[#0F172A]">$1,600<span class="text-xs font-normal text-[#64748B]">/person</span></span>
              </div>
            </div>
            <a href="calculator.html" class="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-sm rounded-xl flex items-center justify-center transition-colors">
              Calculate rent split
            </a>
          </div>
        </div>
      </article>

    </div>

    <!-- Custom Calculation Banner -->
    <div class="mt-12 p-6 bg-white rounded-2xl border border-[#F1F5F9] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h3 class="text-base font-bold text-[#0F172A]">Custom apartment calculation</h3>
        <p class="text-xs text-[#64748B] mt-0.5">Have another lease or private rental in mind? Calculate fair splits for any floor plan.</p>
      </div>
      <a href="calculator.html" class="px-5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors whitespace-nowrap">
        Open Custom Calculator
      </a>
    </div>

  </main>

  <!-- Footer -->
  <footer class="w-full bg-white border-t border-[#F1F5F9] py-8 px-8 sm:px-16 mt-16 text-xs text-[#64748B] flex flex-col sm:flex-row items-center justify-between gap-4">
    <p>&copy; 2025 Rentwise. UCSD Off-Campus Utility.</p>
    <div class="flex items-center gap-6">
      <a href="#" class="hover:text-[#0F172A] transition-colors">About</a>
      <a href="#" class="hover:text-[#0F172A] transition-colors">Calculators</a>
      <a href="#" class="hover:text-[#0F172A] transition-colors">Guidelines</a>
      <a href="#" class="hover:text-[#0F172A] transition-colors">Privacy</a>
    </div>
  </footer>

</body>
</html>
```

---

## 2. `calculator.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Simple Rent Calculator — Rentwise</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-[#FAFAFA] text-[#1E293B] antialiased min-h-screen flex flex-col justify-between">

  <!-- Header Navigation -->
  <header class="w-full bg-white border-b border-[#F1F5F9] py-5 px-8 sm:px-16 flex items-center justify-between sticky top-0 z-30">
    <div class="font-bold text-xl tracking-tight text-[#0F172A]">Rentwise</div>
    <nav class="flex items-center gap-8 text-sm font-medium text-[#64748B]">
      <a href="explore.html" class="hover:text-[#0F172A] transition-colors">Explore</a>
      <a href="calculator.html" class="text-[#0F172A] font-semibold">Calculator</a>
      <a href="#" class="hover:text-[#0F172A] transition-colors">About</a>
    </nav>
  </header>

  <!-- Main Content -->
  <main class="max-w-5xl mx-auto px-6 py-12 w-full flex-1">
    
    <div class="mb-8">
      <a href="explore.html" class="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#0F172A] transition-colors mb-3">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Explore
      </a>
      <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-[#0F172A]">Rent Calculator</h1>
      <p class="text-[#64748B] text-base mt-1">Find out what you'll actually pay each month.</p>
    </div>

    <!-- 2-Column Grid Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <!-- Left Column: Inputs -->
      <div class="lg:col-span-7 flex flex-col gap-6">
        
        <!-- Step 1: Base Rent -->
        <section class="bg-white rounded-2xl p-6 border border-[#F1F5F9] shadow-sm">
          <div class="flex items-center gap-3 mb-4">
            <span class="w-6 h-6 rounded-full bg-[#F1F5F9] text-xs font-bold text-[#475569] flex items-center justify-center">1</span>
            <h2 class="text-lg font-bold text-[#0F172A]">Rent</h2>
          </div>
          
          <label class="block text-xs font-medium text-[#64748B] mb-2">Base monthly rent</label>
          <div class="relative flex items-center mb-5">
            <span class="absolute left-4 text-xl font-medium text-[#94A3B8]">$</span>
            <input type="number" id="baseRent" value="3600" class="w-full bg-[#F8FAFC] border-0 rounded-xl py-3.5 pl-9 pr-4 text-2xl font-bold text-[#0F172A] focus:ring-2 focus:ring-[#0F172A] outline-none" />
          </div>

          <label class="block text-xs font-medium text-[#64748B] mb-2">Lease length</label>
          <div class="grid grid-cols-2 gap-3">
            <button type="button" class="py-3 px-4 rounded-xl text-sm font-medium bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F5F9] transition-colors">9 Months</button>
            <button type="button" class="py-3 px-4 rounded-xl text-sm font-semibold bg-[#0F172A] text-white transition-colors">12 Months (Standard)</button>
          </div>
        </section>

        <!-- Step 2: Monthly Extras -->
        <section class="bg-white rounded-2xl p-6 border border-[#F1F5F9] shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-[#F1F5F9] text-xs font-bold text-[#475569] flex items-center justify-center">2</span>
              <h2 class="text-lg font-bold text-[#0F172A]">Monthly extras</h2>
            </div>
            <span class="text-sm font-semibold text-[#0F172A]" id="extrasTotalDisplay">+$330/mo</span>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-xl">
              <div>
                <p class="text-sm font-semibold text-[#0F172A]">Utilities</p>
                <p class="text-xs text-[#94A3B8]">Water, gas, electric &amp; trash</p>
              </div>
              <div class="flex items-center gap-1.5 font-bold text-[#0F172A]">
                <span class="text-xs text-[#94A3B8]">$</span>
                <input type="number" value="150" class="w-16 bg-transparent text-right outline-none font-bold text-[#0F172A]" />
              </div>
            </div>

            <div class="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-xl">
              <div>
                <p class="text-sm font-semibold text-[#0F172A]">Internet / WiFi</p>
                <p class="text-xs text-[#94A3B8]">High-speed home plan</p>
              </div>
              <div class="flex items-center gap-1.5 font-bold text-[#0F172A]">
                <span class="text-xs text-[#94A3B8]">$</span>
                <input type="number" value="60" class="w-16 bg-transparent text-right outline-none font-bold text-[#0F172A]" />
              </div>
            </div>

            <div class="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-xl">
              <div>
                <p class="text-sm font-semibold text-[#0F172A]">Parking spot</p>
                <p class="text-xs text-[#94A3B8]">Reserved resident stall</p>
              </div>
              <div class="flex items-center gap-1.5 font-bold text-[#0F172A]">
                <span class="text-xs text-[#94A3B8]">$</span>
                <input type="number" value="100" class="w-16 bg-transparent text-right outline-none font-bold text-[#0F172A]" />
              </div>
            </div>

            <div class="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-xl">
              <div>
                <p class="text-sm font-semibold text-[#0F172A]">Insurance &amp; other</p>
                <p class="text-xs text-[#94A3B8]">Renter's policy or extras</p>
              </div>
              <div class="flex items-center gap-1.5 font-bold text-[#0F172A]">
                <span class="text-xs text-[#94A3B8]">$</span>
                <input type="number" value="20" class="w-16 bg-transparent text-right outline-none font-bold text-[#0F172A]" />
              </div>
            </div>
          </div>
        </section>

        <!-- Step 3: Move-in Deposit -->
        <section class="bg-white rounded-2xl p-6 border border-[#F1F5F9] shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-[#F1F5F9] text-xs font-bold text-[#475569] flex items-center justify-center">3</span>
              <h2 class="text-lg font-bold text-[#0F172A]">Move-in deposit</h2>
            </div>
            <span class="text-xs text-[#94A3B8]">One-time costs</span>
          </div>

          <div class="space-y-3 mb-4">
            <div class="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-xl">
              <div>
                <p class="text-sm font-semibold text-[#0F172A]">Security deposit</p>
                <p class="text-xs text-[#94A3B8]">Refundable when you move out</p>
              </div>
              <div class="flex items-center gap-1.5 font-bold text-[#0F172A]">
                <span class="text-xs text-[#94A3B8]">$</span>
                <input type="number" value="3600" class="w-16 bg-transparent text-right outline-none font-bold text-[#0F172A]" />
              </div>
            </div>

            <div class="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-xl">
              <div>
                <p class="text-sm font-semibold text-[#0F172A]">Application fee</p>
                <p class="text-xs text-[#94A3B8]">Processing fee</p>
              </div>
              <div class="flex items-center gap-1.5 font-bold text-[#0F172A]">
                <span class="text-xs text-[#94A3B8]">$</span>
                <input type="number" value="50" class="w-16 bg-transparent text-right outline-none font-bold text-[#0F172A]" />
              </div>
            </div>
          </div>

          <label class="flex items-center gap-3 cursor-pointer select-none pt-2">
            <input type="checkbox" checked class="w-4 h-4 rounded text-[#0F172A] focus:ring-0 accent-[#0F172A]" />
            <span class="text-xs font-medium text-[#475569]">Include first month's rent in total move-in cost</span>
          </label>
        </section>

      </div>

      <!-- Right Column: Sticky Summary Card -->
      <div class="lg:col-span-5 sticky top-28">
        <aside class="bg-white rounded-2xl p-7 border border-[#F1F5F9] shadow-sm">
          <p class="text-xs font-bold tracking-wider text-[#94A3B8] uppercase">You pay each month</p>
          <div class="flex items-baseline gap-1 mt-1 mb-6">
            <span class="text-4xl font-extrabold tracking-tight text-[#0F172A]">$3,930</span>
            <span class="text-base text-[#64748B]">/ mo</span>
          </div>

          <!-- Mini Breakdown -->
          <div class="border-t border-[#F8FAFC] py-4 space-y-2.5 text-sm">
            <div class="flex justify-between text-[#475569]">
              <span>Apartment rent</span>
              <span class="font-semibold text-[#0F172A]">$3,600</span>
            </div>
            <div class="flex justify-between text-[#475569]">
              <span>Bills &amp; extras</span>
              <span class="font-semibold text-[#0F172A]">+$330</span>
            </div>
          </div>

          <!-- Move-in block -->
          <div class="border-t border-[#F8FAFC] py-5 flex items-baseline justify-between">
            <div>
              <p class="text-sm font-semibold text-[#0F172A]">Due at move-in</p>
              <p class="text-xs text-[#94A3B8]">Deposit + first month</p>
            </div>
            <span class="text-2xl font-bold text-[#0F172A]">$7,580</span>
          </div>

          <!-- Main CTA -->
          <button type="button" class="w-full py-3.5 px-4 bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 transition-all mt-2">
            <span>Split with roommates</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>

          <!-- Secondary Actions -->
          <div class="flex items-center justify-between text-xs text-[#64748B] pt-5 mt-2 border-t border-[#F8FAFC]">
            <button type="button" class="hover:text-[#0F172A] transition-colors">Reset to defaults</button>
            <button type="button" class="flex items-center gap-1.5 hover:text-[#0F172A] transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>Save or share</span>
            </button>
          </div>
        </aside>
      </div>

    </div>
  </main>

  <!-- Footer -->
  <footer class="w-full bg-white border-t border-[#F1F5F9] py-8 px-8 sm:px-16 mt-16 text-xs text-[#64748B] flex flex-col sm:flex-row items-center justify-between gap-4">
    <p>&copy; 2025 Rentwise. UCSD Off-Campus Utility.</p>
    <div class="flex items-center gap-6">
      <a href="#" class="hover:text-[#0F172A] transition-colors">About</a>
      <a href="#" class="hover:text-[#0F172A] transition-colors">Calculators</a>
      <a href="#" class="hover:text-[#0F172A] transition-colors">Guidelines</a>
      <a href="#" class="hover:text-[#0F172A] transition-colors">Privacy</a>
    </div>
  </footer>

</body>
</html>
```
