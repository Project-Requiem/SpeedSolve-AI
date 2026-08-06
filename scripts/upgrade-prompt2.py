path = '/home/z/my-project/src/app/api/solve/route.ts'
with open(path, 'r') as f:
    content = f.read()

# Replace SAMPLE_PROBLEMS with comprehensive ones covering grade 6-12
old_samples_start = 'const SAMPLE_PROBLEMS: Record<string, { text: string; label: string }[]> = {'
old_samples_end = '};'

s_start = content.find(old_samples_start)
if s_start == -1:
    print('ERROR: SAMPLE_PROBLEMS start not found')
    exit(1)

# Find the closing }; for SAMPLE_PROBLEMS
# We need to find the matching brace
bracket_depth = 0
found_end = -1
for i in range(s_start, len(content)):
    if content[i] == '{':
        bracket_depth += 1
    elif content[i] == '}':
        bracket_depth -= 1
        if bracket_depth == 0:
            found_end = i + 1  # include the }
            break

if found_end == -1:
    print('ERROR: Could not find end of SAMPLE_PROBLEMS')
    exit(1)

# Find the next newline after the closing brace
while found_end < len(content) and content[found_end] != '\n':
    found_end += 1

new_samples = '''const SAMPLE_PROBLEMS: Record<string, { text: string; label: string }[]> = {
  mathematics: [
    { text: "Solve 3x + 5 = 14", label: "Linear Equation" },
    { text: "Solve x^2 - 5x + 6 = 0", label: "Quadratic" },
    { text: "Find 15% of 200", label: "Percentage" },
    { text: "Find the LCM and HCF of 48, 72, 108", label: "LCM & HCF" },
    { text: "A train travels 360 km in 4 hours. Find its speed in m/s.", label: "Speed" },
    { text: "Find the area of a circle with radius 14 cm.", label: "Area" },
    { text: "If sin θ = 3/5, find cos θ and tan θ.", label: "Trigonometry" },
    { text: "Find the mean, median, mode of: 5, 3, 7, 3, 5, 9, 3, 1", label: "Statistics" },
    { text: "A ladder 10 m long leans against a wall. If the foot is 6 m from the wall, find the height.", label: "Pythagoras" },
    { text: "Differentiate f(x) = 3x^4 - 2x^2 + 5x - 7", label: "Derivative" },
    { text: "Find the 10th term of AP: 2, 7, 12, 17, ...", label: "Sequence" },
    { text: "Simple Interest on Rs 5000 at 8% per annum for 3 years", label: "Interest" },
    { text: "Find the distance between points A(3,4) and B(7,1)", label: "Coordinate" },
    { text: "Simplify: (a+b)^2 - (a-b)^2", label: "Identity" },
    { text: "A bag contains 5 red, 3 blue, and 2 green balls. Find probability of drawing a red ball.", label: "Probability" },
    { text: "Integrate ∫(2x + 3)dx", label: "Integration" },
    { text: "Find the value of tan 15° using compound angles", label: "Compound Angles" },
    { text: "Prove that √2 is irrational", label: "Proof" },
    { text: "Find the surface area and volume of a cone with radius 7 cm and height 24 cm", label: "Mensuration" },
    { text: "Solve: 2x + 3y = 12 and 4x - y = 5", label: "Simultaneous Eq" },
    { text: "Find the sum of first 20 terms of AP: 3, 7, 11, 15, ...", label: "AP Sum" },
    { text: "If A = {1,2,3,4} and B = {3,4,5,6}, find A∩B and A∪B", label: "Sets" },
    { text: "Find the zeros of the polynomial p(x) = x^2 - 4x + 3", label: "Polynomials" },
    { text: "Evaluate: lim(x→0) (sin x)/x", label: "Limits" },
  ],
  physics: [
    { text: "A car travels 150 km in 2.5 hours. Find its average speed.", label: "Kinematics" },
    { text: "A 2 kg block is pushed with 10 N force on a frictionless surface. Find acceleration.", label: "Newton's Law" },
    { text: "A ball is thrown upward with velocity 20 m/s. Find max height. (g=10)", label: "Projectile" },
    { text: "A 60 kg person climbs 5 m stairs in 10 s. Find power. (g=9.8)", label: "Work & Power" },
    { text: "Find the resistance of a circuit with 12V battery and 3A current.", label: "Ohm's Law" },
    { text: "A 0.5 kg object moves in a circle of radius 2m at 3 m/s. Find centripetal force.", label: "Circular Motion" },
    { text: "An object is dropped from 20m height. Find velocity at ground. (g=9.8)", label: "Free Fall" },
    { text: "Two objects of masses 2kg and 4kg moving at 6 m/s and 0 m/s collide and stick. Find final velocity.", label: "Momentum" },
    { text: "A convex lens has focal length 20 cm. An object is placed 30 cm from the lens. Find image distance.", label: "Lens Formula" },
    { text: "Calculate the current through a 4Ω and 6Ω resistor in series with a 10V battery.", label: "Series Circuit" },
    { text: "A wave has frequency 500 Hz and wavelength 0.5 m. Find the wave speed.", label: "Wave Speed" },
    { text: "Find the energy stored in a capacitor of 10μF charged to 100V. (E = 1/2 CV^2)", label: "Capacitor" },
    { text: "An object is placed 15 cm from a concave mirror of focal length 10 cm. Find image position.", label: "Mirror Formula" },
    { text: "A wire of resistance 10Ω is stretched to double its length. Find new resistance.", label: "Resistivity" },
    { text: "Find the kinetic energy of a 1000 kg car moving at 20 m/s.", label: "Kinetic Energy" },
  ],
  chemistry: [
    { text: "Find the pH of 0.01 M HCl solution.", label: "pH" },
    { text: "How many moles of NaOH are in 80 g? (Na=23, O=16, H=1)", label: "Moles" },
    { text: "Balance: Fe + O2 = Fe2O3", label: "Balance" },
    { text: "A gas at 2 atm and 300 K occupies 5 L. What volume at 1 atm and 300 K?", label: "Gas Law" },
    { text: "Find the molarity of 4g NaOH in 500 mL solution. (Na=23, O=16, H=1)", label: "Molarity" },
    { text: "What is the empirical formula of a compound with 40% C, 6.7% H, 53.3% O? (C=12, H=1, O=16)", label: "Empirical" },
    { text: "50 mL of 0.1 M HCl reacts with 25 mL of NaOH. Find molarity of NaOH.", label: "Reaction" },
    { text: "Calculate the mass of one atom of carbon. (Avogadro number = 6.022 x 10^23, C=12)", label: "Mole Concept" },
    { text: "Write the electron configuration of Fe (Z=26)", label: "Electron Config" },
    { text: "Find the oxidation number of Mn in KMnO4", label: "Oxidation" },
    { text: "The rate of a reaction doubles when temperature increases from 300K to 310K. Find activation energy.", label: "Rate Law" },
    { text: "Calculate the enthalpy change when 2 mol of H2 reacts with O2 to form water. ΔH = -286 kJ/mol", label: "Thermochem" },
  ],
};
'''

content = content[:s_start] + new_samples + content[found_end:]
print('2. Replaced SAMPLE_PROBLEMS with 24+15+12 comprehensive samples')

with open(path, 'w') as f:
    f.write(content)

print('Phase 2 done')
