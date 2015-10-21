

all:
	cl /D_CRT_SECURE_NO_DEPRECATE vs8ppc2003arm/arm-wince-as.c
	cl /D_CRT_SECURE_NO_DEPRECATE vs8ppc2003arm/arm-wince-gcc.c
	cl /D_CRT_SECURE_NO_DEPRECATE vs8ppc2003arm/arm-wince-lib.c
	cl /D_CRT_SECURE_NO_DEPRECATE vs8ppc2003arm/arm-wince-link.c
	mv arm-wince-as.exe vs8ppc2003arm
	mv arm-wince-gcc.exe vs8ppc2003arm
	mv arm-wince-lib.exe vs8ppc2003arm
	mv arm-wince-link.exe vs8ppc2003arm
	rm -f *.obj
ifdef WM50
	devenv ../shunt/build/vs8/mozce_shunt_static.sln /rebuild "Release|Windows Mobile 5.0 Pocket PC SDK (ARMV4I)"
else
	devenv ../shunt/build/vs8/mozce_shunt_static.sln /rebuild "Release|Pocket PC 2003 (ARMV4)"
endif

clobber:
	rm -f vs8ppc2003arm/*.exe
	rm -f vs8ppc2003arm/*.obj
	rm -f *.obj
	rm -f *.exe
ifdef WM50
	devenv ../shunt/build/vs8/mozce_shunt_static.sln /clean "Release|Windows Mobile 5.0 Pocket PC SDK (ARMV4I)"
else
	devenv ../shunt/build/vs8/mozce_shunt_static.sln /clean "Release|Pocket PC 2003 (ARMV4)"
endif
