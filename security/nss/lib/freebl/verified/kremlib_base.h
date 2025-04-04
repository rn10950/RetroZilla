/* Copyright 2016-2017 INRIA and Microsoft Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#ifndef __KREMLIB_BASE_H
#define __KREMLIB_BASE_H

#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#ifndef _MSC_VER // [
#error "Use this header only with Microsoft Visual C++ compilers!"
#endif // _MSC_VER ]

#if _MSC_VER >= 1800 // [ VS2013 (VC12) provides inttypes.h
#include <inttypes.h>
#else // _MSC_VER >= 1800 ][

#if _MSC_VER > 1000
#pragma once
#endif

#if (!defined(_MSC_VER) || (defined(_MSC_VER) && _MSC_VER > 1400))
#include <stdint.h>
#else
#include "MSStdInt.h"
#endif

// 7.8 Format conversion of integer types

typedef struct {
   intmax_t quot;
   intmax_t rem;
} imaxdiv_t;

// 7.8.1 Macros for format specifiers

#if !defined(__cplusplus) || defined(__STDC_FORMAT_MACROS) // [   See footnote 185 at page 198

// The fprintf macros for signed integers are:
#define PRId8       "d"
#define PRIi8       "i"
#define PRIdLEAST8  "d"
#define PRIiLEAST8  "i"
#define PRIdFAST8   "d"
#define PRIiFAST8   "i"

#define PRId16       "hd"
#define PRIi16       "hi"
#define PRIdLEAST16  "hd"
#define PRIiLEAST16  "hi"
#define PRIdFAST16   "hd"
#define PRIiFAST16   "hi"

#define PRId32       "I32d"
#define PRIi32       "I32i"
#define PRIdLEAST32  "I32d"
#define PRIiLEAST32  "I32i"
#define PRIdFAST32   "I32d"
#define PRIiFAST32   "I32i"

#define PRId64       "I64d"
#define PRIi64       "I64i"
#define PRIdLEAST64  "I64d"
#define PRIiLEAST64  "I64i"
#define PRIdFAST64   "I64d"
#define PRIiFAST64   "I64i"

#define PRIdMAX     "I64d"
#define PRIiMAX     "I64i"

#define PRIdPTR     "Id"
#define PRIiPTR     "Ii"

// The fprintf macros for unsigned integers are:
#define PRIo8       "o"
#define PRIu8       "u"
#define PRIx8       "x"
#define PRIX8       "X"
#define PRIoLEAST8  "o"
#define PRIuLEAST8  "u"
#define PRIxLEAST8  "x"
#define PRIXLEAST8  "X"
#define PRIoFAST8   "o"
#define PRIuFAST8   "u"
#define PRIxFAST8   "x"
#define PRIXFAST8   "X"

#define PRIo16       "ho"
#define PRIu16       "hu"
#define PRIx16       "hx"
#define PRIX16       "hX"
#define PRIoLEAST16  "ho"
#define PRIuLEAST16  "hu"
#define PRIxLEAST16  "hx"
#define PRIXLEAST16  "hX"
#define PRIoFAST16   "ho"
#define PRIuFAST16   "hu"
#define PRIxFAST16   "hx"
#define PRIXFAST16   "hX"

#define PRIo32       "I32o"
#define PRIu32       "I32u"
#define PRIx32       "I32x"
#define PRIX32       "I32X"
#define PRIoLEAST32  "I32o"
#define PRIuLEAST32  "I32u"
#define PRIxLEAST32  "I32x"
#define PRIXLEAST32  "I32X"
#define PRIoFAST32   "I32o"
#define PRIuFAST32   "I32u"
#define PRIxFAST32   "I32x"
#define PRIXFAST32   "I32X"

#define PRIo64       "I64o"
#define PRIu64       "I64u"
#define PRIx64       "I64x"
#define PRIX64       "I64X"
#define PRIoLEAST64  "I64o"
#define PRIuLEAST64  "I64u"
#define PRIxLEAST64  "I64x"
#define PRIXLEAST64  "I64X"
#define PRIoFAST64   "I64o"
#define PRIuFAST64   "I64u"
#define PRIxFAST64   "I64x"
#define PRIXFAST64   "I64X"

#define PRIoMAX     "I64o"
#define PRIuMAX     "I64u"
#define PRIxMAX     "I64x"
#define PRIXMAX     "I64X"

#define PRIoPTR     "Io"
#define PRIuPTR     "Iu"
#define PRIxPTR     "Ix"
#define PRIXPTR     "IX"

// DO NOT SUPPORT THE scanf MACROS!  See the comment at the top of
// IntegerPrintfMacros.h.

#endif // __STDC_FORMAT_MACROS ]

// 7.8.2 Functions for greatest-width integer types

// 7.8.2.1 The imaxabs function
#define imaxabs _abs64

// 7.8.2.2 The imaxdiv function

// This is modified version of div() function from Microsoft's div.c found
// in %MSVC.NET%\crt\src\div.c
#ifdef STATIC_IMAXDIV // [
static
#else // STATIC_IMAXDIV ][
_inline
#endif // STATIC_IMAXDIV ]
imaxdiv_t __cdecl imaxdiv(intmax_t numer, intmax_t denom)
{
   imaxdiv_t result;

   result.quot = numer / denom;
   result.rem = numer % denom;

   if (numer < 0 && result.rem > 0) {
      // did division wrong; must fix up
      ++result.quot;
      result.rem -= denom;
   }

   return result;
}

// 7.8.2.3 The strtoimax and strtoumax functions
#define strtoimax _strtoi64
#define strtoumax _strtoui64

// 7.8.2.4 The wcstoimax and wcstoumax functions
#define wcstoimax _wcstoi64
#define wcstoumax _wcstoui64

#endif // _MSC_VER >= 1800 ]

#if defined(_MSC_VER) && _MSC_VER <= 1700
/* stdbool.h standard header */

#define __bool_true_false_are_defined	1

#ifndef __cplusplus

#define bool	_Bool
#define false	0
#define true	1

#endif /* __cplusplus */

#else
#include <stdbool.h>
#endif /* _STDBOOL */

/*
 * Copyright (c) 1992-2010 by P.J. Plauger.  ALL RIGHTS RESERVED.
 * Consult your license regarding permissions and restrictions.
V5.30:0009 */

/******************************************************************************/
/* Some macros to ease compatibility                                          */
/******************************************************************************/

/* Define __cdecl and friends when using GCC, so that we can safely compile code
 * that contains __cdecl on all platforms. Note that this is in a separate
 * header so that Dafny-generated code can include just this file. */
#ifndef _MSC_VER
/* Use the gcc predefined macros if on a platform/architectures that set them.
 * Otherwise define them to be empty. */
#ifndef __cdecl
#define __cdecl
#endif
#ifndef __stdcall
#define __stdcall
#endif
#ifndef __fastcall
#define __fastcall
#endif
#endif

#ifdef __GNUC__
#define inline __inline__
#endif

/* GCC-specific attribute syntax; everyone else gets the standard C inline
 * attribute. */
#ifdef __GNU_C__
#ifndef __clang__
#define force_inline inline __attribute__((always_inline))
#else
#define force_inline inline
#endif
#else
#define force_inline inline
#endif

#if !defined(__cplusplus) && defined(_MSC_VER) && _MSC_VER < 1900
#define inline 
#endif

/******************************************************************************/
/* Implementing C.fst                                                         */
/******************************************************************************/

/* Uppercase issue; we have to define lowercase versions of the C macros (as we
 * have no way to refer to an uppercase *variable* in F*). */
extern int exit_success;
extern int exit_failure;

/* This one allows the user to write C.EXIT_SUCCESS. */
typedef int exit_code;

void print_string(const char *s);
void print_bytes(uint8_t *b, uint32_t len);

/* The universal null pointer defined in C.Nullity.fst */
#define C_Nullity_null(X) 0

/* If some globals need to be initialized before the main, then kremlin will
 * generate and try to link last a function with this type: */
void kremlinit_globals(void);

/******************************************************************************/
/* Implementation of machine integers (possibly of 128-bit integers)          */
/******************************************************************************/

/* Integer types */
typedef uint64_t FStar_UInt64_t, FStar_UInt64_t_;
typedef int64_t FStar_Int64_t, FStar_Int64_t_;
typedef uint32_t FStar_UInt32_t, FStar_UInt32_t_;
typedef int32_t FStar_Int32_t, FStar_Int32_t_;
typedef uint16_t FStar_UInt16_t, FStar_UInt16_t_;
typedef int16_t FStar_Int16_t, FStar_Int16_t_;
typedef uint8_t FStar_UInt8_t, FStar_UInt8_t_;
typedef int8_t FStar_Int8_t, FStar_Int8_t_;

static inline uint32_t
rotate32_left(uint32_t x, uint32_t n)
{
    /*  assert (n<32); */
    return (x << n) | (x >> (32 - n));
}
static inline uint32_t
rotate32_right(uint32_t x, uint32_t n)
{
    /*  assert (n<32); */
    return (x >> n) | (x << (32 - n));
}

/* Constant time comparisons */
static inline uint8_t
FStar_UInt8_eq_mask(uint8_t x, uint8_t y)
{
    x = ~(x ^ y);
    x &= x << 4;
    x &= x << 2;
    x &= x << 1;
    return (int8_t)x >> 7;
}

static inline uint8_t
FStar_UInt8_gte_mask(uint8_t x, uint8_t y)
{
    return ~(uint8_t)(((int32_t)x - y) >> 31);
}

static inline uint16_t
FStar_UInt16_eq_mask(uint16_t x, uint16_t y)
{
    x = ~(x ^ y);
    x &= x << 8;
    x &= x << 4;
    x &= x << 2;
    x &= x << 1;
    return (int16_t)x >> 15;
}

static inline uint16_t
FStar_UInt16_gte_mask(uint16_t x, uint16_t y)
{
    return ~(uint16_t)(((int32_t)x - y) >> 31);
}

static inline uint32_t
FStar_UInt32_eq_mask(uint32_t x, uint32_t y)
{
    x = ~(x ^ y);
    x &= x << 16;
    x &= x << 8;
    x &= x << 4;
    x &= x << 2;
    x &= x << 1;
    return ((int32_t)x) >> 31;
}

static inline uint32_t
FStar_UInt32_gte_mask(uint32_t x, uint32_t y)
{
    return ~((uint32_t)(((int64_t)x - y) >> 63));
}

static inline uint64_t
FStar_UInt64_eq_mask(uint64_t x, uint64_t y)
{
    x = ~(x ^ y);
    x &= x << 32;
    x &= x << 16;
    x &= x << 8;
    x &= x << 4;
    x &= x << 2;
    x &= x << 1;
    return ((int64_t)x) >> 63;
}

static inline uint64_t
FStar_UInt64_gte_mask(uint64_t x, uint64_t y)
{
    uint64_t low63 =
        ~((uint64_t)((int64_t)((int64_t)(x & UINT64_C(0x7fffffffffffffff)) -
                               (int64_t)(y & UINT64_C(0x7fffffffffffffff))) >>
                     63));
    uint64_t high_bit =
        ~((uint64_t)((int64_t)((int64_t)(x & UINT64_C(0x8000000000000000)) -
                               (int64_t)(y & UINT64_C(0x8000000000000000))) >>
                     63));
    return low63 & high_bit;
}

#endif
